export async function sendOtpEmailStub(email: string, otp: string) {
  // Placeholder: integrate real email service in production
  // For development we log the OTP to console. NEVER do this in production.
  console.log(`[OTP EMAIL STUB] Send OTP ${otp} to ${email}`);
}