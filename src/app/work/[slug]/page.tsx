import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function WorkDetail({ params }: { params: { slug: string } }) {
  return (
    <div>
      <Header />

      <main>
        <section>
          <h1 className="project-name col-span-full">{params.slug}</h1>
        </section>
      </main>

      <Footer />
    </div>
  );
}
