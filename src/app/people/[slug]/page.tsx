import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Image from "next/image";
import styles from "./page.module.css";

export default async function PersonDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return (
    <div>
      <Header />

      <main>
        <section className={styles.section}>
          <div className={styles.content}>
            <div className={styles.topContent}>
              <h1 className="project-name">Firstname Lastname</h1>
              <div className={styles.infoRow}>
                <p className={styles.label}>Available for</p>
                <p>Summer 2026</p>
              </div>
            </div>
            <div className={styles.bottomContent}>
              <div className={styles.infoRow}>
                <p className={styles.label}>Role</p>
                <p>Role</p>
              </div>
              <div className={styles.infoRow}>
                <p className={styles.label}>Role</p>
                <p>Role</p>
              </div>
              <div className={styles.infoRow}>
                <p className={styles.label}>Role</p>
                <p>Role</p>
              </div>
            </div>
          </div>
          <div className={styles.imageContainer}>
            <Image
              src="/NYA00500-3.png"
              alt=""
              width={800}
              height={533}
              className={styles.image}
              priority
            />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
