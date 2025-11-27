import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/toaster";
import { SmsNotificationWorker } from "@/components/sms-notification-worker";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Glan Credible and Capital Inc. - Online Lending Management System",
  description: "Glan Credible and Capital Incorporated - Your trusted online lending partner",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={archivo.variable} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers>
          <SmsNotificationWorker />
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
