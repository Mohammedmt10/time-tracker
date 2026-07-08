"use client";

import { useEffect } from "react";

interface ReCAPTCHAProps {
  sitekey: string;
}

declare global {
  interface Window {
    grecaptcha: any;
  }
}

export default function ReCAPTCHA({ sitekey }: ReCAPTCHAProps) {
  useEffect(() => {
    if (!sitekey || sitekey.trim() === "") return;

    const id = "recaptcha-script";
    if (!document.getElementById(id)) {
      const script = document.createElement("script");
      script.id = id;
      script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(sitekey)}`;
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
  }, [sitekey]);

  return null; // Invisible component, reCAPTCHA v3 handles rendering the badge automatically
}
