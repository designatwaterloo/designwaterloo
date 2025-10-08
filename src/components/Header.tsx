import Image from "next/image";

export default function Header() {
  return (
    <header className="container py-[var(--small)] px-[var(--big)]">
      <img src="/Design Waterloo Wordmark.svg" alt="Design Waterloo" className="col-start-1 fixed top-[var(--small)] left-[var(--big)] z-50 h-[calc(var(--small)+4px)] w-auto [filter:invert(1)] mix-blend-difference" />
      <img src="/Design Waterloo Logo.svg" alt="Design Waterloo" className="col-start-3 fixed top-[var(--small)] left-[calc(var(--big)+2*(100vw-2*var(--big))/12+2*var(--gap))] z-50 h-[calc(var(--small)+4px)] w-auto [filter:invert(1)] mix-blend-difference" />
      <div className="col-span-3 col-start-7">
        <p className="text-[#aeaeae]">
          A collective and directory of student designers* from the University of Waterloo and Wilfrid Laurier University.
        </p>
      </div>
      <div className="col-span-2 col-start-10">
        {/* Secondary Logo */}
        <svg width="44" height="36" viewBox="0 0 44 36" fill="white" className="">
          {/* Logo SVG placeholder */}
        </svg>
      </div>
      <div className="col-start-12 flex justify-end fixed top-[var(--small)] right-[var(--big)] z-50">
        <button className="btn-menu">
          Menu
        </button>
      </div>
    </header>
  );
}
