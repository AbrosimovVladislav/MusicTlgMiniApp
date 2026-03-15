import type { Metadata } from "next";
import { TelegramProvider } from "@/components/shared/telegram-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Music Expert App",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-bg text-text-primary antialiased">
        <TelegramProvider>{children}</TelegramProvider>
      </body>
    </html>
  );
}
