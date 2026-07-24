import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Market Opportunity Mapper",
  description: "ZIP-level market opportunity maps for sales pitches",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
