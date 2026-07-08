import type { Metadata } from "next";
import { Merriweather_Sans, Raleway, Signika, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const merriweatherSans = Merriweather_Sans({
  variable: "--font-merriweather-sans",
  subsets: ["latin"],
  display: "swap",
});

const raleway = Raleway({
  variable: "--font-raleway",
  subsets: ["latin"],
  display: "swap",
});

const signika = Signika({
  variable: "--font-signika",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "WorkTime - Premium Work Tracker & Analytics",
  description: "Track your day-to-day working hours, analyze historical patterns, and optimize your productivity with professional logs and SVG analytics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${merriweatherSans.variable} ${raleway.variable} ${signika.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        {/* Blocking inline script: applies theme before first paint — prevents flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('worktime_theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(t===null&&d)){document.documentElement.classList.add('dark');}else{document.documentElement.classList.remove('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
