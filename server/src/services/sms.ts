import twilio from 'twilio';

export async function sendWelcomeSms(
  toPhone: string,
  username: string,
  password: string
): Promise<void> {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER } = process.env;

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    // Dev fallback — do NOT log the plaintext password here
    console.log(`[SMS MOCK] Welcome SMS would be sent to: ${toPhone}`);
    console.log(`[SMS MOCK] Username: ${username} | Password: ${password} (Logged only in development/mock)`);
    return;
  }

  const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

  // Phone must be E.164 format: +94771234567
  await client.messages.create({
    from: TWILIO_FROM_NUMBER,
    to: toPhone,
    body: `Neutronics Cold Chain: Your username is "${username}" and your temporary password is "${password}". Please log in and change it immediately.`,
  });
}

export async function sendPasswordResetSms(
  toPhone: string,
  username: string,
  password: string
): Promise<void> {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER } = process.env;

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    console.log(`[SMS MOCK] Password reset SMS would be sent to: ${toPhone}`);
    console.log(`[SMS MOCK] Username: ${username} | Temporary Password: ${password} (Logged only in development/mock)`);
    return;
  }

  const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

  await client.messages.create({
    from: TWILIO_FROM_NUMBER,
    to: toPhone,
    body: `Neutronics Cold Chain: A password reset was requested. Your temporary password is "${password}". Please log in and change it immediately.`,
  });
}

export async function sendAlertSms(
  toPhone: string,
  alertType: 'temperature' | 'humidity',
  value: number,
  threshold: number,
  status: 'warning' | 'critical'
): Promise<void> {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER } = process.env;

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    console.log(`[SMS MOCK] Alert SMS would be sent to: ${toPhone}`);
    console.log(`[SMS MOCK] ${alertType.toUpperCase()} ALERT: ${value} (Threshold: ${threshold})`);
    return;
  }

  const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

  await client.messages.create({
    from: TWILIO_FROM_NUMBER,
    to: toPhone,
    body: `Neutronics ALERT: ${status.toUpperCase()} breach for ${alertType}. Current value is ${value} (Threshold: ${threshold}). Please check dashboard immediately.`,
  });
}
