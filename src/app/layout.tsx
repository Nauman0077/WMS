import type { Metadata } from "next";
import { Orbitron, Rajdhani } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider"

const bodyFont = Rajdhani({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const displayFont = Orbitron({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "WMS SKU Module",
  description: "Internal warehouse product management module",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${bodyFont.variable} ${displayFont.variable}`} data-theme="light">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
