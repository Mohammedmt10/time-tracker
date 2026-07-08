"use client";

import { useEffect, useRef } from "react";

interface ReCAPTCHAProps {
  sitekey: string;
  onChange: (token: string | null) => void;
}

declare global {
  interface Window {
    grecaptcha: any;
    onRecaptchaLoad?: () => void;
  }
}

export default function ReCAPTCHA({ sitekey, onChange }: ReCAPTCHAProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<any>(null);

  useEffect(() => {
    const renderRecaptcha = () => {
      if (window.grecaptcha && containerRef.current && widgetIdRef.current === null) {
        try {
          widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
            sitekey: sitekey,
            callback: (token: string) => onChange(token),
            "expired-callback": () => onChange(null),
            "error-callback": () => onChange(null),
            theme: "dark", // styled to match the dark slate colors of the app
          });
        } catch (e) {
          console.error("Failed to render reCAPTCHA:", e);
        }
      }
    };

    // Store callbacks globally for onload call from script
    window.onRecaptchaLoad = renderRecaptcha;

    if (!window.grecaptcha) {
      const id = "recaptcha-script";
      if (!document.getElementById(id)) {
        const script = document.createElement("script");
        script.id = id;
        script.src = "https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit";
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
      }
    } else {
      renderRecaptcha();
    }

    return () => {
      // Clean up the DOM element to prevent double rendering issues under React Strict Mode
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
      widgetIdRef.current = null;
    };
  }, [sitekey, onChange]);

  return <div ref={containerRef} className="my-3 flex justify-center scale-95 origin-center" />;
}
