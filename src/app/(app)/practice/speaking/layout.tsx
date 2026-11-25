import type { Metadata } from "next";

export const metadata: Metadata = { title: "Разговорная практика" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
