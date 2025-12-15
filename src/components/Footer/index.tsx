"use client";

import Image from "next/image";
import { useState, useEffect } from "react";

interface FooterProps {
  variant?: "default" | "menu";
}

export default function Footer({ variant = "default" }: FooterProps) {
  const [currentTime, setCurrentTime] = useState<string>("");
  const [currentDate, setCurrentDate] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();

      // Format date: "October 25, 2025"
      const dateOptions: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'America/Toronto'
      };
      const formattedDate = now.toLocaleDateString('en-US', dateOptions);

      // Format time: "00:23"
      const timeOptions: Intl.DateTimeFormatOptions = {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'America/Toronto',
      };
      const formattedTime = now.toLocaleTimeString('en-US', timeOptions);

      setCurrentDate(formattedDate);
      setCurrentTime(`${formattedTime}`);
    };

    // Update immediately
    updateTime();

    // Update every second
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  const bgColor = variant === "menu" ? "bg-[#000000]" : "bg-white";
  const textColor = variant === "menu" ? "text-white" : "text-black";
  const linkColor = variant === "menu" ? "!text-white" : "text-black";
  const linkHoverColor = variant === "menu" ? "hover:!text-white" : "";
  const topPadding = variant === "menu" ? "pt-0" : "pt-[240px]";
  const sidePadding = variant === "menu" ? "" : "px-[var(--margin)]";
  const wordmarkClass = variant === "menu" ? "invert brightness-0" : "";

  return (
    <footer className={`w-full ${sidePadding} ${topPadding} pb-[var(--small)] ${bgColor} ${textColor} flex flex-col gap-[var(--big)] sm:gap-0 items-center`}>
      {/* Mobile: Stacked layout, Desktop: 12-column grid */}
      <div className="w-full flex flex-col gap-[var(--big)] sm:grid sm:grid-cols-12 sm:gap-[var(--gap)] mb-[var(--big)]">
 
        {/* Local Time - Mobile: full width, Desktop: Columns 1-3 */}
        <dl className="flex flex-col gap-[10px] sm:col-span-3 sm:pr-[4px]">
          <dt className="text-[#b5b5b5]">Local Time</dt>
          <dd className="flex flex-col m-0">
            <p suppressHydrationWarning>{currentDate || "Loading..."}</p>
            <p suppressHydrationWarning className="tabular-nums">
              {currentTime || "Loading..."} Eastern Time
            </p>
            <p>Waterloo, ON, Canada</p>
          </dd>
        </dl>

        {/* About - Hidden on mobile, Desktop: Columns 4-6 */}
        <dl className="hidden sm:flex sm:flex-col gap-[10px] sm:col-span-3 sm:pr-[4px]">
          <dt className="text-[#b5b5b5]">Colophon</dt>
          <dd className="m-0">
            <p>Our font is <a href="https://rsms.me/inter/?utm_source=designwaterloo" target="_blank" rel="noopener noreferrer" className={`${linkColor} ${linkHoverColor} underline`}>Inter Semibold</a>. We designed this site in <a href="https://www.figma.com/?utm_source=designwaterloo" target="_blank" rel="noopener noreferrer" className={`${linkColor} ${linkHoverColor} underline`}>Figma</a>, built in <a href="https://nextjs.org/?utm_source=designwaterloo" target="_blank" rel="noopener noreferrer" className={`${linkColor} ${linkHoverColor} underline`}>Next.js</a> alongside our friend <a href="https://claude.ai/?utm_source=designwaterloo" target="_blank" rel="noopener noreferrer" className={`${linkColor} ${linkHoverColor} underline`}>Claude</a>, and manage with <a href="https://www.sanity.io/?utm_source=designwaterloo" target="_blank" rel="noopener noreferrer" className={`${linkColor} ${linkHoverColor} underline`}>Sanity</a>. Forever a work in progress.</p>
          </dd>
        </dl>

        {/* Email - Mobile: hidden in menu variant, Desktop: Columns 7-9 */}
        <dl className={`flex flex-col gap-[10px] sm:col-span-3 sm:pr-[4px] ${variant === "menu" ? "max-sm:hidden" : ""}`}>
          <dt className="text-[#b5b5b5]">Email</dt>
          <dd className="m-0"><a href="mailto:designatwaterloo@gmail.com">designatwaterloo@gmail.com</a></dd>
        </dl>

        {/* Follow - Mobile: hidden in menu variant, Desktop: Columns 10-11 */}
        <dl className={`flex flex-col gap-[10px] sm:col-span-2 ${variant === "menu" ? "max-sm:hidden" : ""}`}>
          <dt className="text-[#b5b5b5]">Follow</dt>
          <dd className="m-0 flex flex-col gap-[10px]">
            <a href="https://www.instagram.com/designwaterloo/?utm_source=designwaterloo" target="_blank" rel="noopener noreferrer" className={`${linkColor} ${linkHoverColor} underline`}>Instagram</a>
            <a href="https://twitter.com/designwaterloo/?utm_source=designwaterloo" target="_blank" rel="noopener noreferrer" className={`${linkColor} ${linkHoverColor} underline`}>Twitter</a>
            <a href="https://www.linkedin.com/company/designwaterloo/?utm_source=designwaterloo" target="_blank" rel="noopener noreferrer" className={`${linkColor} ${linkHoverColor} underline`}>LinkedIn</a>
          </dd>
        </dl>

        {/* Logo - Desktop only for default variant */}
        {variant === "default" && (
          <div className="hidden sm:flex sm:col-span-1 sm:justify-end">
            <Image
              src="/Design Waterloo Logo.svg"
              alt="Design Waterloo"
              width={45}
              height={36}
              className="w-auto h-9"
            />
          </div>
        )}
      </div>

      {/* Large horizontal wordmark - hidden on mobile in menu variant */}
      <div className={`w-full ${variant === "menu" ? "max-sm:hidden" : ""}`}>
        <Image
          src="/Design Waterloo Wordmark Horizontal.svg"
          alt="Design Waterloo"
          width={470}
          height={65}
          className={`w-full h-auto ${wordmarkClass}`}
        />
      </div>

      {/* Bottom row */}
      <div className="w-full flex justify-between items-center">
        <p>© 2025 Design Waterloo</p>
        <p>Version 1.0</p>
      </div>
    </footer>
  );
}
