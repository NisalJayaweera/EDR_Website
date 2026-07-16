import { Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import pool from '../db/index';
import { generateInitialPassword } from '../services/password';
import { sendWelcomeEmail, sendPasswordResetEmail } from '../services/email';
import { sendWelcomeSms, sendPasswordResetSms } from '../services/sms';
import { AuthRequest } from '../middleware/auth';

const customerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(1, 'Phone number is required'),
  address: z.string().optional(),
});

export const addCustomer = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const validatedData = customerSchema.parse(req.body);

    // Generate username (slugified name with collision handling)
    const baseUsername = validatedData.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '.')
      .replace(/\.+/g, '.')
      .replace(/^\.+|\.+$/g, '');
    let finalUsername = baseUsername;

    let userExists = true;
    while (userExists) {
      const result = await pool.query('SELECT id FROM users WHERE username = $1', [finalUsername]);
      if (result.rows.length === 0) {
        userExists = false;
      } else {
        finalUsername = `${baseUsername}.${Math.floor(Math.random() * 900) + 100}`;
      }
    }

    // Generate password — exists only in memory for the duration of this request
    const plainPassword = generateInitialPassword();
    const passwordHash = await bcrypt.hash(plainPassword, 12);

    const insertResult = await pool.query(
      `INSERT INTO users (name, email, phone, address, username, password_hash, must_change_password, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, name, email, phone, created_at`,
      [
        validatedData.name,
        validatedData.email,
        validatedData.phone,
        validatedData.address || '',
        finalUsername,
        passwordHash,
        true,
        'admin',
      ]
    );

    const newUser = insertResult.rows[0];

    // Fire-and-forget: respond immediately, deliver credentials in the background.
    // plainPassword is returned in the response for demo purposes so you can see it in the UI.
    if (validatedData.email) {
      sendWelcomeEmail(validatedData.email, validatedData.name, finalUsername, plainPassword)
        .catch((err: any) => console.error('[addCustomer] Welcome email failed:', err.message || err));
    }
    if (validatedData.phone) {
      sendWelcomeSms(validatedData.phone, finalUsername, plainPassword)
        .catch((err: any) => console.error('[addCustomer] Welcome SMS failed:', err.message || err));
    }

    return res.status(201).json({ ...newUser, temporaryPassword: plainPassword });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: (error as any).errors });
    }
    if (error.code === '23505') { // unique violation
      return res.status(400).json({ message: 'A user with that email already exists.' });
    }
    console.error('Add customer error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getCustomers = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, phone, created_at FROM users WHERE username != $1 ORDER BY created_at DESC',
      [process.env.ADMIN_USERNAME || 'admin'] // Exclude admin if they are in the table
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('Get customers error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * POST /api/admin/devices
 * Body: { user_id, device_label }
 * Creates a new device for a user and returns the api_key ONCE.
 * The api_key is never returned again after this response — treat it like a password.
 */
export const provisionDevice = async (req: AuthRequest, res: Response): Promise<any> => {
  const { user_id, device_label } = req.body;

  if (!user_id) {
    return res.status(400).json({ message: 'user_id is required' });
  }

  try {
    // Verify the user exists
    const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [user_id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate a cryptographically secure 64-char hex API key
    const { randomBytes } = await import('crypto');
    const apiKey = randomBytes(32).toString('hex');

    const result = await pool.query(
      `INSERT INTO devices (user_id, device_label, api_key)
       VALUES ($1, $2, $3)
       RETURNING id, device_label`,
      [user_id, device_label || 'Device 1', apiKey]
    );

    const device = result.rows[0];

    // Return the api_key in this response only — it is never retrievable again
    return res.status(201).json({
      id:           device.id,
      device_label: device.device_label,
      api_key:      apiKey,   // ← flash this to the hardware team; store in firmware flash
      message:      'Device provisioned. Save the api_key now — it cannot be retrieved again.',
    });
  } catch (error) {
    console.error('Provision device error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const resetCustomerPassword = async (req: AuthRequest, res: Response): Promise<any> => {
  const { id } = req.params;

  try {
    // Check if user exists and is not admin
    const result = await pool.query(
      'SELECT id, name, username, email, phone FROM users WHERE id = $1 AND username != $2',
      [id, process.env.ADMIN_USERNAME || 'admin']
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const user = result.rows[0];

    // Generate new temporary password
    const newPassword = generateInitialPassword();
    const hash = await bcrypt.hash(newPassword, 12);

    // Update password hash and force change password flag
    await pool.query(
      'UPDATE users SET password_hash = $1, must_change_password = $2 WHERE id = $3',
      [hash, true, user.id]
    );

    // Fire-and-forget: respond immediately, deliver credentials in the background.
    if (user.email) {
      sendPasswordResetEmail(user.email, user.name, user.username, newPassword)
        .catch((err: any) => console.error('[resetCustomerPassword] Email failed:', err.message || err));
    }
    if (user.phone) {
      sendPasswordResetSms(user.phone, user.username, newPassword)
        .catch((err: any) => console.error('[resetCustomerPassword] SMS failed:', err.message || err));
    }

    return res.json({
      message: 'Password reset successful. Credentials are being sent via email and SMS.',
      temporaryPassword: newPassword,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone
      }
    });
  } catch (error) {
    console.error('Reset customer password error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
