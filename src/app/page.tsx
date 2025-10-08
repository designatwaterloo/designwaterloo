import Header from "@/components/Header";

export default function Home() {
  return (
    <div>
      <Header />

      {/* Main Content */}
      <main>
        {/* Hero Section */}
        <section className="w-screen px-12 pt-12 pb-0 flex flex-col gap-12">
          <div className="flex items-end justify-between w-full">
            <h1>
              The home for design talent at Waterloo, <br />
              and where to find them.
            </h1>

            <div className="flex gap-[11px]">
              <button className="btn-secondary px-4 py-2 gap-[10px]">
                <span className="text-2xl">📇</span>
                <span className="text-2xl tracking-[-0.24px]">Join directory</span>
              </button>
              <button className="btn-primary px-4 py-2 gap-[10px]">
                <span className="text-2xl">🔍</span>
                <span className="text-2xl tracking-[-0.24px]">Find talent</span>
              </button>
            </div>
          </div>

          <div className="w-full aspect-[1191/731] bg-[#d9d9d9] rounded-2xl">
            {/* Hero Image Placeholder */}
          </div>
        </section>

        {/* Raison d'être Section */}
        <section className="w-screen px-12 pt-[57px] pb-0 flex flex-col gap-[31px]">
          <div className="border-b-2 border-black/[0.22] pb-[11px]">
            <p className="text-xl text-black/[0.22] tracking-[-0.4px]">
              Raison d&apos;être
            </p>
          </div>

          <p className="jumbo">
            Design Waterloo is an open collective dedicated to nurturing <span>exceptional</span> designers*, artists, filmmakers, engineers, and creatives at the <span className="underline decoration-solid [text-underline-offset:8%]">University of Waterloo</span> and <span className="underline decoration-solid [text-underline-offset:8%]">Wilfrid Laurier University</span>. We&apos;re committed to advancing design excellence in Waterloo, and letting the world know about it.
          </p>
        </section>

        {/* Work Section */}
        <section className="w-screen px-12 py-12 flex flex-col gap-12">
          <div className="border-b-2 border-black/[0.22] pb-[11px]">
            <p className="text-xl text-black/[0.22] tracking-[-0.4px]">Work</p>
          </div>

          <div className="flex gap-2 w-full">
            <div className="flex-1">
              <p className="text-4xl tracking-[-0.72px]">Proof of work.</p>
            </div>
            <p className="flex-1 text-base leading-[1.14] tracking-[-0.32px]">
              Design Waterloo is a vibrant community dedicated to nurturing exceptional designers, artists, filmmakers, engineers, and creatives from the <span className="underline">University of Waterloo</span> and <span className="underline">Wilfrid Laurier University</span>. We&apos;re committed to advancing design excellence in Waterloo, and letting the world know about it.
            </p>
          </div>

          <div className="flex gap-2 w-full">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="card flex-1 flex flex-col gap-4">
                <p className="text-base tracking-[-0.32px] uppercase">Project {i}</p>
                <div className="aspect-[4/5] bg-[#d9d9d9] rounded" />
                <p className="text-base text-[#7f7f7f] tracking-[-0.32px]">
                  Project description goes here.
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Directory Section */}
        <section className="w-screen px-12 py-12 bg-black flex flex-col gap-12">
          <div className="border-b-2 border-white/70 pb-[11px]">
            <p className="text-xl text-white/70 tracking-[-0.4px]">Directory</p>
          </div>

          <div className="flex gap-2 w-full">
            <div className="flex-1">
              <p className="text-4xl text-white tracking-[-0.72px]">The biggest design family on campus.</p>
            </div>
            <p className="w-[590px] text-base text-white leading-[1.14] tracking-[-0.32px]">
              The Design Waterloo directory highlights the top designers, videographers, and artists in one convenient location. It&apos;s your go-to resource for discovering exceptional creative talent from the Waterloo area.
            </p>
          </div>

          <div className="flex flex-col gap-2 w-full">
            {[1, 2, 3].map((row) => (
              <div key={row} className="flex gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div key={i} className="flex-1 aspect-[4/5] bg-[#d9d9d9] rounded" />
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* Play/Events Section */}
        <section className="w-screen px-12 py-12 flex flex-col gap-12">
          <div className="border-b-2 border-black/[0.22] pb-[11px]">
            <p className="text-xl text-black/[0.22] tracking-[-0.4px]">Play</p>
          </div>

          <div className="flex gap-2 w-full">
            <div className="flex-1">
              <p className="text-4xl tracking-[-0.72px] max-w-[463px]">
                We host cute events and workshops to grow design at Waterloo
              </p>
            </div>
            <p className="flex-1 text-base leading-[1.14] tracking-[-0.32px]">
              Design Waterloo is a vibrant community dedicated to nurturing exceptional designers, artists, filmmakers, engineers, and creatives from the <span className="underline">University of Waterloo</span> and <span className="underline">Wilfrid Laurier University</span>. We&apos;re committed to advancing design excellence in Waterloo, and letting the world know about it.
            </p>
          </div>

          <div className="flex gap-2 w-full">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="card flex-1 flex flex-col gap-4">
                <p className="text-base tracking-[-0.32px] uppercase">Event {i}</p>
                <div className="aspect-[4/5] bg-[#d9d9d9] rounded" />
                <p className="text-base text-[#7f7f7f] tracking-[-0.32px]">
                  Event description goes here.
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-screen px-12 py-12 bg-white flex flex-col gap-12 h-[699px]">
        <div className="flex gap-3 w-full">
          {[1, 2, 3, 4].map((col) => (
            <div key={col} className="flex-1 flex flex-col gap-2">
              <div className="border-b-2 border-[dimgrey] pb-[10px]">
                <p className="text-base text-black tracking-[-0.32px]">Section</p>
              </div>
              <div className="flex flex-col gap-[10px]">
                {[1, 2, 3].map((item) => (
                  <p key={item} className="text-base text-[dimgrey] tracking-[-0.32px]">
                    Content {item}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t-2 border-black" />

        <div className="aspect-[930/234] w-full">
          {/* Logo placeholder */}
        </div>

        <div className="flex justify-between items-start w-full">
          <div className="flex gap-4 items-center">
            <a href="#" className="text-base text-black tracking-[-0.32px]">Instagram</a>
            <a href="#" className="text-base text-black tracking-[-0.32px]">Twitter</a>
            <a href="#" className="text-base text-black tracking-[-0.32px]">LinkedIn</a>
            <p className="text-base text-black tracking-[-0.32px]">Newsletter</p>
          </div>
          <div className="flex gap-4">
            <p className="text-base text-black tracking-[-0.32px]">Privacy Policy</p>
            <p className="text-base text-black tracking-[-0.32px]">© 2025 Design Waterloo</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
