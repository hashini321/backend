export function generateOtp(): string {
  // Generate a 4-digit OTP between 1000 and 9999
  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  console.log(`Generated OTP: ${otp}`);
  return otp;
} 
