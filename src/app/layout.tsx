import type { Metadata, Viewport } from "next";
import "./globals.css";
import ConsoleEasterEgg from "@/components/ConsoleEasterEgg";
import SmoothScroll from "@/components/SmoothScroll";
import { ViewTransitions } from "next-view-transitions";

export const metadata: Metadata = {
  title: "Design Waterloo",
  description: "Design Waterloo is a collective and directory of student designers, artists, filmmakers, engineers, and creatives from the University of Waterloo and Wilfrid Laurier University.",
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
    <ViewTransitions>
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://rsms.me/" />
        <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
        <meta name="apple-mobile-web-app-title" content="Waterloo" />
      </head>
      <body className="antialiased">
        <SmoothScroll>
          <ConsoleEasterEgg />
          {children}
        </SmoothScroll>
      </body>
    </html>
    </ViewTransitions>
  );
}
