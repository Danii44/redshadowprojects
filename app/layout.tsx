import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Red Shadow Projects",
  description: "Internal project operations workspace for Red Shadow Designs",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
