import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Button from "@/components/Button";

export default function Home() {
  return (
    <div>
      <Header />

      {/* Main Content */}
      <main>
        {/* Hero Section */}
        <section className="w-full px-[var(--margin)] pt-[calc(var(--small)*3+calc(var(--small)+4px))] pb-0 flex flex-col gap-12">
          <div className="flex items-end justify-between w-full max-lg:flex-col max-lg:items-start max-lg:gap-6">
            <h1>
              The home for design talent at Waterloo, <br />
              and where to find them.
            </h1>

            <div className="flex gap-[11px]">
              <Button text="Join directory" variant="secondary" />
              <Button text="Find talent" variant="primary" icon="/Search.svg" iconAlt="Search" />
            </div>
          </div>

          <div className="w-full aspect-[1191/731] bg-[#d9d9d9] rounded-2xl">
            {/* Hero Image Placeholder */}
          </div>
        </section>

        {/* Raison d'être Section */}
        <section className="w-full px-[var(--margin)] pt-[57px] pb-0 flex flex-col gap-[31px]">
          <div className="section-divider">
            <p className="section-label">
              Raison d&apos;être
            </p>
          </div>

          <p className="jumbo">
            Design Waterloo is an open collective dedicated to nurturing <span>exceptional</span> designers*, artists, filmmakers, engineers, and creatives at the <a href="https://uwaterloo.ca" target="_blank" rel="noopener noreferrer" className="underline decoration-solid [text-underline-offset:8%]">University of Waterloo</a> and <a href="https://wlu.ca" target="_blank" rel="noopener noreferrer" className="underline decoration-solid [text-underline-offset:8%]">Wilfrid Laurier University</a>. We&apos;re committed to advancing design excellence at Waterloo, and letting the world know about it.
          </p>
        </section>

        {/* Work Section */}
        <section id="work" className="w-full px-[var(--margin)] py-12 flex flex-col gap-12">
          <div className="section-divider">
            <p className="section-label">Work</p>
          </div>

          <div className="flex gap-2 w-full max-lg:flex-col max-lg:gap-6">
            <div className="flex-1">
              <h1>Proof of work.</h1>
            </div>
            <p className="flex-1">
              Design Waterloo is a vibrant community dedicated to nurturing exceptional designers, artists, filmmakers, engineers, and creatives from the <span className="underline">University of Waterloo</span> and <span className="underline">Wilfrid Laurier University</span>. We&apos;re committed to advancing design excellence at Waterloo, and letting the world know about it.
            </p>
          </div>

          <div className="grid grid-cols-6 gap-2 w-full max-lg:grid-cols-4 mobile-grid-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="card flex flex-col gap-4">
                <p className="uppercase">Project {i}</p>
                <div className="aspect-[4/5] bg-[#d9d9d9] rounded" />
                <p className="text-[#7f7f7f]">
                  Project description goes here.
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Directory Section */}
        <section id="directory" className="w-full px-[var(--margin)] py-12 flex flex-col gap-12">
          <div className="section-divider">
            <p className="section-label">Directory</p>
          </div>

          <div className="flex gap-2 w-full max-lg:flex-col max-lg:gap-6">
            <div className="flex-1">
              <h1>The biggest design family on campus.</h1>
            </div>
            <p className="w-[590px] max-lg:w-full">
              The Design Waterloo directory highlights the top designers, videographers, and artists in one convenient location. It&apos;s your go-to resource for discovering exceptional creative talent from the Waterloo area.
            </p>
          </div>

          <div className="grid grid-cols-8 gap-2 w-full max-lg:grid-cols-4">
            {[...Array(24)].map((_, i) => (
              <div key={i} className="aspect-[4/5] bg-[#d9d9d9] rounded" />
            ))}
          </div>
        </section>

        {/* Play/Events Section */}
        <section id="play" className="w-full px-[var(--margin)] py-12 flex flex-col gap-12">
          <div className="section-divider">
            <p className="section-label">Play</p>
          </div>

          <div className="flex gap-2 w-full max-lg:flex-col max-lg:gap-6">
            <div className="flex-1">
              <h1 className="max-w-[463px]">
                We host cute events and workshops to grow design at Waterloo
              </h1>
            </div>
            <p className="flex-1">
              Design Waterloo is a vibrant community dedicated to nurturing exceptional designers, artists, filmmakers, engineers, and creatives from the <span className="underline">University of Waterloo</span> and <span className="underline">Wilfrid Laurier University</span>. We&apos;re committed to advancing design excellence at Waterloo, and letting the world know about it.
            </p>
          </div>

          <div className="grid grid-cols-6 gap-2 w-full max-lg:grid-cols-4 mobile-grid-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="card flex flex-col gap-4">
                <p className="uppercase">Event {i}</p>
                <div className="aspect-[4/5] bg-[#d9d9d9] rounded" />
                <p className="text-[#7f7f7f]">
                  Event description goes here.
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
