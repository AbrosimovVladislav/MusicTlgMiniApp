import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { TelegramProvider } from "@/components/shared/telegram-provider";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Music Expert App",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={poppins.variable}>
      <body className="bg-bg text-text antialiased">
        <TelegramProvider>{children}</TelegramProvider>
      </body>
    </html>
  );
}
