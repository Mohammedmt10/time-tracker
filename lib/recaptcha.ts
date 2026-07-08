/**
 * Verifies a Google reCAPTCHA v2 (Invisible) or v3 token against the official Google verification API.
 * Returns true if the token is valid and score is safe, otherwise false.
 */
export async function verifyRecaptcha(token: string): Promise<boolean> {
  // Allow bypassing captcha verification in development mode for localhost testing
  if (process.env.NODE_ENV === "development" && token === "dev-dummy-token") {
    console.log("reCAPTCHA bypassed locally in development mode.");
    return true;
  }

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
    
    if (!data.success) {
      console.warn("reCAPTCHA verification returned success=false:", data["error-codes"]);
      return false;
    }

    // For reCAPTCHA v3, verify the user's score. Google's default safe score threshold is 0.5.
    if (data.score !== undefined && data.score < 0.5) {
      console.warn(`reCAPTCHA blocked suspicious request with low score: ${data.score}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error("reCAPTCHA validation request failed:", error);
    return false;
  }
}
