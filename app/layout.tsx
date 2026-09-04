import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EduInsight AI — Institutional Intelligence",
  description:
    "A deterministic governed institutional analytics prototype with natural-language analysis, powered entirely by synthetic data.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
