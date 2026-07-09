import nodemailer from 'nodemailer';
import dns from 'dns';
import https from 'https';

function createTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    return null; // Will fall back to mock logging or HTTP API
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    socketTimeout: 10000,
    connectionTimeout: 10000,
    // Force DNS resolution to IPv4 only to avoid ENETUNREACH on Render's broken IPv6 network
    lookup: (hostname: string, options: any, callback: any) => {
      dns.lookup(hostname, { family: 4 }, callback);
    },
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  } as any);
}

function sendViaBrevoApi(to: string, subject: string, html: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.SMTP_USER || 'nisalsenuja2003@gmail.com';

    if (!apiKey) {
      return reject(new Error('BREVO_API_KEY is not configured'));
    }

    const postData = JSON.stringify({
      sender: {
        name: 'Neutronics Cold Chain',
        email: senderEmail
      },
      to: [{ email: to }],
      subject: subject,
      htmlContent: html
    });

    const options = {
      hostname: 'api.brevo.com',
      port: 443,
      path: '/v3/smtp/email',
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
        } else {
          reject(new Error(`Brevo HTTP API returned status ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.write(postData);
    req.end();
  });
}

export async function sendWelcomeEmail(
  to: string,
  name: string,
  username: string,
  password: string
): Promise<void> {
  const html = `
    <!DOCTYPE html>
    <html>
      <body style="font-family:Inter,system-ui,sans-serif;background:#f4f4f4;margin:0;padding:24px;">
        <div style="max-width:520px;margin:0 auto;background:#030213;color:#fff;border-radius:12px;padding:40px;border:1px solid rgba(63,198,240,0.3);">
          <img src="https://neutronics.io/logo.png" alt="Neutronics" style="width:48px;margin-bottom:16px;" />
          <h2 style="color:#3FC6F0;margin:0 0 8px;font-size:20px;letter-spacing:1px;">NEUTRONICS COLD CHAIN</h2>
          <p style="color:rgba(255,255,255,0.7);font-size:14px;margin:0 0 28px;">Your monitoring account is ready</p>
          <p style="margin:0 0 20px;">Hi <strong>${name}</strong>,</p>
          <p style="color:rgba(255,255,255,0.8);">Your cold-chain monitoring account has been created. Use the credentials below to log in for the first time.</p>
          <div style="background:rgba(63,198,240,0.08);border:1px solid rgba(63,198,240,0.2);border-radius:8px;padding:20px;margin:24px 0;">
            <p style="margin:0 0 8px;font-size:13px;color:rgba(255,255,255,0.5);">USERNAME</p>
            <p style="margin:0 0 18px;font-size:18px;font-weight:600;color:#3FC6F0;letter-spacing:1px;">${username}</p>
            <p style="margin:0 0 8px;font-size:13px;color:rgba(255,255,255,0.5);">TEMPORARY PASSWORD</p>
            <p style="margin:0;font-size:18px;font-weight:600;color:#3FC6F0;letter-spacing:2px;">${password}</p>
          </div>
          <p style="color:rgba(255,255,255,0.6);font-size:13px;">⚠️ Please log in and <strong>change your password immediately</strong> from the Settings page. This temporary password will not be shown again.</p>
          <hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:28px 0;" />
          <p style="color:rgba(255,255,255,0.4);font-size:12px;margin:0;">— Neutronics Team</p>
        </div>
      </body>
    </html>
  `;

  // 1. Try Brevo HTTP API first (preferred since it works behind firewalls and dynamic IPs without whitelisting)
  if (process.env.BREVO_API_KEY) {
    await sendViaBrevoApi(to, 'Your Neutronics Cold Chain Dashboard Access', html);
    return;
  }

  // 2. Fall back to SMTP
  const transporter = createTransport();
  if (transporter) {
    await transporter.sendMail({
      from: `"Neutronics Cold Chain" <${process.env.SMTP_USER}>`,
      to,
      subject: 'Your Neutronics Cold Chain Dashboard Access',
      html,
    });
    return;
  }

  // 3. Fall back to mock logging
  console.log(`[EMAIL MOCK] Welcome email would be sent to: ${to}`);
  console.log(`[EMAIL MOCK] Username: ${username} | Password: ${password} (Logged only in development/mock)`);
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  username: string,
  password: string
): Promise<void> {
  const html = `
    <!DOCTYPE html>
    <html>
      <body style="font-family:Inter,system-ui,sans-serif;background:#f4f4f4;margin:0;padding:24px;">
        <div style="max-width:520px;margin:0 auto;background:#030213;color:#fff;border-radius:12px;padding:40px;border:1px solid rgba(63,198,240,0.3);">
          <img src="https://neutronics.io/logo.png" alt="Neutronics" style="width:48px;margin-bottom:16px;" />
          <h2 style="color:#3FC6F0;margin:0 0 8px;font-size:20px;letter-spacing:1px;">NEUTRONICS COLD CHAIN</h2>
          <p style="color:rgba(255,255,255,0.7);font-size:14px;margin:0 0 28px;">Password Reset Requested</p>
          <p style="margin:0 0 20px;">Hi <strong>${name}</strong>,</p>
          <p style="color:rgba(255,255,255,0.8);">We received a request to reset your password. Use the credentials below to log in.</p>
          <div style="background:rgba(63,198,240,0.08);border:1px solid rgba(63,198,240,0.2);border-radius:8px;padding:20px;margin:24px 0;">
            <p style="margin:0 0 8px;font-size:13px;color:rgba(255,255,255,0.5);">USERNAME</p>
            <p style="margin:0 0 18px;font-size:18px;font-weight:600;color:#3FC6F0;letter-spacing:1px;">${username}</p>
            <p style="margin:0 0 8px;font-size:13px;color:rgba(255,255,255,0.5);">NEW TEMPORARY PASSWORD</p>
            <p style="margin:0;font-size:18px;font-weight:600;color:#3FC6F0;letter-spacing:2px;">${password}</p>
          </div>
          <p style="color:rgba(255,255,255,0.6);font-size:13px;">⚠️ Please log in and <strong>change your password immediately</strong> from the Settings page. This temporary password will not be shown again.</p>
          <hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:28px 0;" />
          <p style="color:rgba(255,255,255,0.4);font-size:12px;margin:0;">— Neutronics Team</p>
        </div>
      </body>
    </html>
  `;

  // 1. Try Brevo HTTP API first
  if (process.env.BREVO_API_KEY) {
    await sendViaBrevoApi(to, 'Password Reset - Neutronics Cold Chain Dashboard', html);
    return;
  }

  // 2. Fall back to SMTP
  const transporter = createTransport();
  if (transporter) {
    await transporter.sendMail({
      from: `"Neutronics Cold Chain" <${process.env.SMTP_USER}>`,
      to,
      subject: 'Password Reset - Neutronics Cold Chain Dashboard',
      html,
    });
    return;
  }

  // 3. Fall back to mock logging
  console.log(`[EMAIL MOCK] Password reset email would be sent to: ${to}`);
  console.log(`[EMAIL MOCK] Username: ${username} | Temporary Password: ${password} (Logged only in development/mock)`);
}
