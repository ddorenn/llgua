import type { Metadata } from "next";

export const metadata: Metadata = { title: "План на день" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
