import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Design Waterloo",
  description: "Design Waterloo is a collective and directory of student designers, artists, filmmakers, engineers, and creatives from the University of Waterloo and Wilfrid Laurier University.",
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
        {children}
      </body>
    </html>
  );
}
