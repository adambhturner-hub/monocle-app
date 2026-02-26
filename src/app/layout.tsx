import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react"
import { AuthGuard } from "@/components/auth-guard";
import { SyncEngine } from "@/components/sync-engine";
import { FrogAccountability } from "@/components/frog-accountability";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { CommandPalette } from "@/components/command-palette";
import { ErrorBoundary } from "@/components/error-boundary";
import { VersionPoller } from "@/components/version-poller";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://monocle-app.vercel.app"),
  title: "Monocle - The Fancy Focus App",
  description: "Monocle is not another to-do list. It's an execution chamber. Dump your brain into the Queue. Enter Focus Mode. One task. No drift.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Monocle",
  },
  icons: {
    icon: '/monocle_icon.png',
    apple: '/monocle_icon.png',
  },
  openGraph: {
    title: "Monocle - The Fancy Focus App",
    description: "Monocle is not another to-do list. It's an execution chamber. Dump your brain into the Queue. Enter Focus Mode. One task. No drift.",
    url: "https://monocle-app.vercel.app/?v=3",
    siteName: "Monocle",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Monocle App Preview",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Monocle - The Fancy Focus App",
    description: "Monocle is not another to-do list. It's an execution chamber. Dump your brain into the Queue. Enter Focus Mode. One task. No drift.",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ErrorBoundary>
            <AuthGuard>
              <SyncEngine />
              <FrogAccountability />
              {children}
              <Toaster />
              <CommandPalette />
              <VersionPoller />
            </AuthGuard>
          </ErrorBoundary>
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
