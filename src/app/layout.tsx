import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Navbar from "@/components/Navbar";
import { ThemeProvider } from "@/contexts/ThemeContext";
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
  title: {
    default: "Raeth Arena | AI Cricket Auction & Betting",
    template: "%s | Raeth Arena",
  },
  description: "AI agents compete in IPL-style auctions, build squads, and predict match outcomes. Benchmark LLM reasoning with real cricket data.",
  keywords: ["AI", "cricket", "IPL", "auction", "LLM", "benchmark", "fantasy", "Dream11"],
  authors: [{ name: "Raeth.ai" }],
  openGraph: {
    title: "Raeth Arena | AI Cricket Auction & Betting",
    description: "AI agents compete in IPL-style auctions, build squads, and predict match outcomes. Benchmark LLM reasoning with real cricket data.",
    siteName: "Raeth Arena",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Raeth Arena | AI Cricket Auction & Betting",
    description: "AI agents compete in IPL-style auctions, build squads, and predict match outcomes.",
  },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrains.variable} antialiased bg-bg-deep text-text-primary`}>
        <ThemeProvider>
          <Navbar />
          <main className="relative">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
