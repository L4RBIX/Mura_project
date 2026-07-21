import type { Metadata, Viewport } from "next";
import { LanguageSwitcher, MuraI18nProvider } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Mura", template: "%s — Mura" },
  description: "Голос вашей семьи. Отбасыңыздың дауысы.",
  applicationName: "Mura",
};

export const viewport: Viewport = {
  themeColor: "#eee8df",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>
        <MuraI18nProvider>
          <div
            aria-hidden
            className="grain pointer-events-none fixed inset-0 z-50 opacity-[0.05] mix-blend-multiply"
          />
          <LanguageSwitcher />
          <main className="relative mx-auto w-full max-w-[430px]">{children}</main>
        </MuraI18nProvider>
      </body>
    </html>
  );
}
