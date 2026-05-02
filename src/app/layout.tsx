import type { Metadata } from "next";
import { AppShell } from "@/components/chrome/AppShell";
import { layoutStore } from "@/server/layout";
import "./globals.css";

export const metadata: Metadata = {
  title: "Moshimo Box",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const initialLayout = layoutStore.getCurrent();
  return (
    <html lang="en">
      <body>
        <AppShell initialLayout={initialLayout}>{children}</AppShell>
      </body>
    </html>
  );
}
