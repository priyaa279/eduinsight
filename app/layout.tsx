import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EduInsight AI — Institutional Intelligence",
  description:
    "An agentic institutional intelligence workspace for higher education, powered entirely by synthetic data.",
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
