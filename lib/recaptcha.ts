/**
 * Verifies a Google reCAPTCHA v2 token against the official Google verification API.
 * Returns true if the token is valid, otherwise false.
 */
export async function verifyRecaptcha(token: string): Promise<boolean> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  
  if (!secret) {
    console.warn("RECAPTCHA_SECRET_KEY is not configured in the server environment.");
    return false; // Fail secure if keys are missing
  }

  if (!token || token.trim() === "") {
    return false;
  }

  try {
    const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `secret=${encodeURIComponent(secret)}&response=${encodeURIComponent(token)}`,
    });

    const data = await response.json();
    return !!data.success;
  } catch (error) {
    console.error("reCAPTCHA validation request failed:", error);
    return false;
  }
}
