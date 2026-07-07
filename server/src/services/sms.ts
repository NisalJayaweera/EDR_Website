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
    console.log(`[SMS MOCK] Username: ${username} | Password: [REDACTED — check SMS delivery]`);
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
