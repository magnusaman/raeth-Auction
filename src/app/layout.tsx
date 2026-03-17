import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Outfit, IBM_Plex_Mono } from "next/font/google";
import Navbar from "@/components/Navbar";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Toaster } from "sonner";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const jakartaSans = Plus_Jakarta_Sans({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${outfit.variable} ${jakartaSans.variable} ${plexMono.variable} antialiased bg-bg-deep text-text-primary`}
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
                color: "#E8E4DE",
                borderRadius: "12px",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
