import type { Metadata } from "next";
import { Assistant } from "next/font/google";
import "./globals.css";

const assistant = Assistant({
  subsets: ["hebrew", "latin"],
  variable: "--font-assistant",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL('https://www.smart-worksheets.co.il'),
  title: {
    default: "דפי עבודה בחשבון להדפסה - מחולל תרגילים לכיתות א׳-ו׳",
    template: "%s | דפי עבודה חכמים"
  },
  description: "מחולל דפי עבודה חכם המאפשר יצירת דפי תרגול בחשבון והנדסה מותאמים אישית. תרגול 4 פעולות חשבון, שברים, אחוזים, הנדסה ועוד. חינם וללא הרשמה.",
  keywords: ["דפי עבודה בחשבון", "דפי עבודה להדפסה", "תרגילי חשבון", "חשבון לכיתה א", "חשבון לכיתה ב", "מחולל דפי עבודה", "דפי עבודה בשברים", "דפי עבודה באחוזים"],
  openGraph: {
    title: "דפי עבודה בחשבון להדפסה - חינם וללא הרשמה",
    description: "צרו דפי עבודה מותאמים אישית בחשבון והנדסה בקלות. מתאים למורים, הורים ותלמידים.",
    url: 'https://www.smart-worksheets.co.il',
    siteName: 'Smart Worksheets',
    locale: 'he_IL',
    type: 'website',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'Smart Worksheets - דפי עבודה חכמים',
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body
        className={`${assistant.variable} antialiased font-sans bg-slate-50 text-slate-900`}
      >
        {children}
      </body>
    </html>
  );
}
