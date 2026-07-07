import { Response } from 'express';
import bcrypt from 'bcrypt';
import pool from '../db/index';
import { AuthRequest } from '../middleware/auth';

export const changePassword = async (req: AuthRequest, res: Response): Promise<any> => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user?.userId;

  if (req.user?.role === 'admin') {
    return res.status(403).json({ message: 'Admin password cannot be changed here' });
  }

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current password and new password are required' });
  }

  try {
    const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid current password' });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await pool.query(
      'UPDATE users SET password_hash = $1, must_change_password = false WHERE id = $2',
      [newPasswordHash, userId]
    );

    return res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
