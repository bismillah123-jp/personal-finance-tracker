import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider, AuthProvider } from "@/components/providers";
import { PWAProvider } from "@/components/pwa-provider";

export const metadata: Metadata = {
  title: "FinTrack - Personal Finance Tracker",
  description: "Kelola keuangan pribadi Anda dengan mudah dan bijak",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FinTrack",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-180x180.png" />
        <link rel="icon" href="/icons/icon-32x32.png" sizes="32x32" />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <AuthProvider>
            <PWAProvider>{children}</PWAProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
