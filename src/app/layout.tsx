import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import ConsoleEasterEgg from "@/components/ConsoleEasterEgg";
import SmoothScroll from "@/components/SmoothScroll";
import { TransitionProvider } from "@/context/TransitionContext";
import PageTransition from "@/components/PageTransition";
import { AuthProvider } from "@/components/auth/AuthProvider";

export const metadata: Metadata = {
  metadataBase: new URL('https://designwaterloo.com'),
  title: "Design Waterloo",
  description: "Design Waterloo is a collective and directory of student designers, artists, filmmakers, engineers, and creatives from the University of Waterloo and Wilfrid Laurier University.",
  openGraph: {
    title: "Design Waterloo",
    description: "Design Waterloo is a collective and directory of student designers, artists, filmmakers, engineers, and creatives from the University of Waterloo and Wilfrid Laurier University.",
    images: [
      {
        url: '/ogimage.png',
        width: 1200,
        height: 630,
        alt: 'Design Waterloo',
      }
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Design Waterloo",
    description: "Design Waterloo is a collective and directory of student designers, artists, filmmakers, engineers, and creatives from the University of Waterloo and Wilfrid Laurier University.",
    images: ['/ogimage.png'],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://rsms.me/" />
        <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
        <meta name="apple-mobile-web-app-title" content="Waterloo" />
      </head>
      <body className="antialiased">
        <AuthProvider>
          <TransitionProvider>
            <SmoothScroll>
              <ConsoleEasterEgg />
              <PageTransition />
              {children}
            </SmoothScroll>
          </TransitionProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
