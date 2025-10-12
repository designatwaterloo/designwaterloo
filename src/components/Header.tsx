import Image from "next/image";
import Link from "next/link";

export default function Header() {
  return (
    <header className="container py-[var(--small)] px-[var(--big)]">
      <Link href="/">
        <Image src="/Design Waterloo Wordmark.svg" alt="Design Waterloo" width={200} height={36} className="header-logo col-start-1 left-[var(--big)] cursor-pointer" priority />
      </Link>
      <Link href="/">
        <Image src="/Design Waterloo Logo.svg" alt="Design Waterloo" width={36} height={36} className="header-logo col-start-3 left-[calc(var(--big)+2*(100vw-2*var(--big))/12+2*var(--gap))] cursor-pointer" priority />
      </Link>
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
      <button className="btn-menu col-start-12 fixed top-[var(--small)] right-[var(--big)] z-50 [filter:invert(1)] mix-blend-difference bg-white">
        Menu
      </button>
    </header>
  );
}
