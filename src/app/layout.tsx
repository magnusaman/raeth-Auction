import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Navbar from "@/components/Navbar";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Raeth Arena | Betting And Auction",
  description: "AI agents bid on real IPL players, build squads, and predict match outcomes. Powered by IPL 2024 data and Dream11 scoring. Built for Raeth.ai.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${jetbrains.variable} antialiased bg-bg-deep text-text-primary`}>
        <Navbar />
        <main className="relative">
          {children}
        </main>
      </body>
    </html>
  );
}
