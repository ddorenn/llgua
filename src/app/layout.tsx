import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Literata, Onest } from "next/font/google";
import { THEME_SCRIPT, ThemeProvider } from "@/lib/theme";
import { CurtainProvider } from "@/components/brand/curtain";
import "./globals.css";

/** Interface voice. */
const onest = Onest({ variable: "--font-onest", subsets: ["latin", "cyrillic"], display: "swap" });
/** Brand display: the LINGUA wordmark and large Latin type (variable weight/width for interactive type). */
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  axes: ["wdth", "opsz"],
  display: "swap",
});
/** The language being learned: examples, words, reading texts, corrections. */
const literata = Literata({
  variable: "--font-literata",
  subsets: ["latin", "latin-ext", "cyrillic"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "LINGUA — Your English Tutor", template: "%s — LINGUA" },
  description:
    "Персональная платформа для системного изучения английского языка: грамматика, словарь, чтение, аудирование, разговорная практика и письмо.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#efece6" },
    { media: "(prefers-color-scheme: dark)", color: "#111110" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className={`${onest.variable} ${literata.variable} ${bricolage.variable} min-h-dvh bg-bg text-fg antialiased`}>
        <ThemeProvider>
          <CurtainProvider>{children}</CurtainProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
