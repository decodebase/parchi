import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";

export const metadata: Metadata = {
  title: {
    default: "Parchi — Event Tickets in Pakistan",
    template: "%s | Parchi",
  },
  description: "Discover and book tickets to the best events in Pakistan.",
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#FF6A3D",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-text antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
