import Header from "@/components/Header";
import Footer from "@/components/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About | Design Waterloo",
  openGraph: {
    title: "About | Design Waterloo",
    images: [{ url: '/ogimage.png', width: 1200, height: 630 }],
  },
  twitter: {
    title: "About | Design Waterloo",
    images: ['/ogimage.png'],
  },
};

export default function AboutPage() {
  return (
    <div>
      <Header />
      <main className="w-full">
        <section className="w-full px-[var(--margin)] py-12 flex flex-col gap-12">
          <h1>About</h1>
        </section>
      </main>
      <Footer />
    </div>
  );
}