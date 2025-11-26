import Header from "@/components/Header";
import Footer from "@/components/Footer";

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