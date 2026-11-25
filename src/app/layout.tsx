import type { Metadata, Viewport } from "next";
import { Literata, Onest } from "next/font/google";
import { THEME_SCRIPT, ThemeProvider } from "@/lib/theme";
import "./globals.css";

/** Interface voice. */
const onest = Onest({ variable: "--font-onest", subsets: ["latin", "cyrillic"], display: "swap" });
/** The language being learned: examples, words, reading texts, corrections. */
const literata = Literata({
  variable: "--font-literata",
  subsets: ["latin", "latin-ext", "cyrillic"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "LINGUA — English learning, built around you", template: "%s · LINGUA" },
  description:
    "A personal learning space to improve grammar, vocabulary, reading, listening, speaking and writing — one step at a time.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1eff3" },
    { media: "(prefers-color-scheme: dark)", color: "#18171c" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className={`${onest.variable} ${literata.variable} min-h-dvh bg-bg text-fg antialiased`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
