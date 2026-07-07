import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../db/index';
import { AuthRequest } from '../middleware/auth';

export const login = async (req: Request, res: Response): Promise<any> => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ message: 'Identifier and password are required' });
  }

  try {
    // 1. Check Admin Hardcode
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

    if (identifier === adminUsername) {
      if (!adminPasswordHash) {
        // Fallback for demo if hash not set in env, though it should be.
        // We'll just compare '123' if there's no hash configured, but usually we compare hash.
        if (password === '123') {
           const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET || 'replace_me', { expiresIn: process.env.JWT_EXPIRES_IN || '12h' });
           return res.json({ token, role: 'admin' });
        }
      } else {
        const isMatch = await bcrypt.compare(password, adminPasswordHash);
        if (isMatch) {
          const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET || 'replace_me', { expiresIn: process.env.JWT_EXPIRES_IN || '12h' });
          return res.json({ token, role: 'admin' });
        }
      }
    }

    // 2. Check Database Users
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [identifier]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: 'user' },
      process.env.JWT_SECRET || 'replace_me',
      { expiresIn: process.env.JWT_EXPIRES_IN || '12h' }
    );

    return res.json({
      token,
      role: 'user',
      mustChangePassword: user.must_change_password
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const logout = (req: Request, res: Response) => {
  // If using cookies, we'd clear it here.
  // For localStorage, client handles deletion.
  return res.json({ message: 'Logged out successfully' });
};

export const getMe = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    if (req.user?.role === 'admin') {
      return res.json({
        id: 'admin',
        username: process.env.ADMIN_USERNAME || 'admin',
        role: 'admin',
        name: 'Administrator'
      });
    }

    const result = await pool.query(
      'SELECT id, name, email, phone, address, username, must_change_password, created_at FROM users WHERE id = $1',
      [req.user?.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = result.rows[0];
    return res.json({ ...user, role: 'user' });

  } catch (error) {
    console.error('Get me error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
