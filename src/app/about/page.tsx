import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Button from "@/components/Button";
import type { Metadata } from "next";
import styles from "./page.module.css";

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
        <section className="w-full px-(--margin) py-12 flex flex-col gap-12">
          <h1>The best designers go to Waterloo.</h1>
          <article className={`w-full max-w-[640px] flex flex-col gap-(--small) ${styles.article}`}>
            <p>Talented people are rarely one-dimensional.</p>
            
            <p>Waterloo is full of exactly those people.</p>
            
            <p>In a small city just outside of Toronto lies the design industry&apos;s best-kept secret.</p>
            
            <p>Our reputation is engineering. CS. Math.</p>
            
            <p>But the best designers here are often those people too—engineers who stayed up late drawing as kids, computer scientists who care deeply about craft.</p>
            
            <p>School puts them through the gauntlet. Students here do 5-6 internships before they graduate. Not summer projects. Real jobs at real companies.</p>
            
            <p>You work across teams. Across cities. Shipping products at scale before you have your degree.</p>
            
            <p>By the time they&apos;re done, they&apos;ve built a depth of experience most designers don&apos;t touch until years into their careers. They know what it means to collaborate with engineers because they&apos;re surrounded by them.</p>
            
            <p>They come out sharper.</p>
            
            <p>We can&apos;t fully explain it, but we can show you.</p>
            
            <p className={styles.extraSpacing}>Despite all this, we think we&apos;ve been too coy.</p>
            
            <p>It&apos;s too hard to find this talent. For employers looking. For students trying to find each other. The engineering reputation drowns everything else out.</p>
            
            <p>In an era where anyone can prompt anything into existence, craft matters more than ever. Waterloo is ready to meet that demand.</p>
            
            <p className={styles.extraSpacing}>Design Waterloo is an open collective for creatives at UW and Laurier. We&apos;re working on a few things:</p>
            
            <ul className="flex flex-col gap-(--gap)">
                <li><span className="font-semibold text-[#7f7f7f]">Directory</span> - A showcase of Waterloo&apos;s design talent. Where employers find exceptional designers and students find each other.</li>
                <li><span className="font-semibold text-[#7f7f7f]">Community</span> - Supporting existing initiatives and clubs on campus while empowering new ones. Real events and guest lectures where designers, filmmakers, engineers, and artists actually collaborate. Not networking for the sake of it—actual work across disciplines.</li>
                <li><span className="font-semibold text-[#7f7f7f]">Opportunities</span> - Linking students with companies and projects that understand what design talent looks like. Not mixers. Real work with real teams.</li>
            </ul>
            
            <p>This is the kind of home we wish we had starting out. A place where the culture isn&apos;t about staying in your lane. Where rising tides lift all boats.</p>
            
            <p className={styles.extraSpacing}>We&apos;re making Waterloo impossible to ignore.</p>
          </article>
          
          <div className="flex justify-start">
            <Button href="/directory" variant="primary" icon="/Search.svg" iconAlt="Search">Find talent</Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}