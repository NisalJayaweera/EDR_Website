import { Response } from 'express';
import path from 'path';
import fs from 'fs';
import pool from '../db/index';
import { AuthRequest } from '../middleware/auth';

/**
 * Authorization helper.
 * Returns the csv_files row ONLY if it ultimately belongs to the requesting user
 * (via: csv_files → devices → users.id = req.user.userId).
 * Never trusts the client to scope the query — the SQL WHERE does it.
 */
async function getFileForUser(fileId: string, userId: string) {
  const result = await pool.query(
    `SELECT cf.id, cf.file_name, cf.storage_path, cf.size_bytes, cf.uploaded_at, cf.device_id
     FROM csv_files cf
     JOIN devices d ON d.id = cf.device_id
     WHERE cf.id = $1 AND d.user_id = $2`,
    [fileId, userId]
  );
  return result.rows[0] ?? null;
}

/** GET /api/files — list all CSV files belonging to the requesting user */
export const listFiles = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const result = await pool.query(
      `SELECT cf.id, cf.file_name, cf.size_bytes, cf.uploaded_at, cf.device_id, d.device_label
       FROM csv_files cf
       JOIN devices d ON d.id = cf.device_id
       WHERE d.user_id = $1
       ORDER BY cf.uploaded_at DESC`,
      [req.user?.userId]
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('List files error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/** GET /api/files/:id/download — stream file to client */
export const downloadFile = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const file = await getFileForUser(req.params.id, req.user!.userId!);

    if (!file) {
      return res.status(404).json({ message: 'File not found or access denied' });
    }

    const absPath = path.resolve(file.storage_path);

    if (!fs.existsSync(absPath)) {
      return res.status(404).json({ message: 'File no longer exists on disk' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${file.file_name}"`);
    res.setHeader('Content-Type', 'text/csv');
    return res.sendFile(absPath);
  } catch (error) {
    console.error('Download file error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/** DELETE /api/files/:id — delete from disk and DB */
export const deleteFile = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const file = await getFileForUser(req.params.id, req.user!.userId!);

    if (!file) {
      return res.status(404).json({ message: 'File not found or access denied' });
    }

    // Delete from disk (don't error if already gone)
    const absPath = path.resolve(file.storage_path);
    if (fs.existsSync(absPath)) {
      fs.unlinkSync(absPath);
    }

    // Delete from DB
    await pool.query('DELETE FROM csv_files WHERE id = $1', [file.id]);

    return res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete file error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
