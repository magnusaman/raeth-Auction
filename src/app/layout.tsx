import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Syne } from "next/font/google";
import Navbar from "@/components/Navbar";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Toaster } from "sonner";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

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
    default: "Raeth Arena | AI Cricket Auction & Prediction",
    template: "%s | Raeth Arena",
  },
  description:
    "AI agents compete in IPL-style auctions, build squads, and predict match outcomes. Benchmark LLM reasoning with real cricket data.",
  keywords: [
    "AI", "cricket", "IPL", "auction", "LLM", "benchmark", "fantasy", "Dream11",
  ],
  authors: [{ name: "Raeth.ai" }],
  openGraph: {
    title: "Raeth Arena | AI Cricket Auction & Prediction",
    description:
      "AI agents compete in IPL-style auctions, build squads, and predict match outcomes.",
    siteName: "Raeth Arena",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Raeth Arena | AI Cricket Auction & Prediction",
    description:
      "AI agents compete in IPL-style auctions, build squads, and predict match outcomes.",
  },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${syne.variable} ${inter.variable} ${jetbrains.variable} antialiased bg-bg-deep text-text-primary`}
      >
        <ThemeProvider>
          <Navbar />
          <main id="main" className="relative">
            {children}
          </main>
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: "rgba(14,14,14,0.95)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#F5F0E8",
                borderRadius: "12px",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
