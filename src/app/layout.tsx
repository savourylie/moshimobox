import type { Metadata } from "next";
import { AppShell } from "@/components/chrome/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Moshimo Box",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
