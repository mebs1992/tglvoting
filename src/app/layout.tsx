import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TGL — The Greatest League",
  description: "The Greatest League — League Headquarters",
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
