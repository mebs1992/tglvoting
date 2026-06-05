import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TGL Rules Voting",
  description: "The Greatest League — Rules Voting Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
