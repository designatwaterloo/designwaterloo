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
    <footer className={`w-full ${sidePadding} ${topPadding} pb-[var(--big)] ${bgColor} ${textColor} flex flex-col gap-[var(--big)] items-center`}>
      {/* 12-column grid with footer sections */}
      <div className="w-full grid grid-cols-12 gap-[var(--gap)]">
 
        {/* Local Time - Columns 1-3 */}
        <dl className="col-span-3 flex flex-col gap-[10px] pr-[4px]">
          <dt className="text-[#b5b5b5]">Local Time</dt>
          <dd className="flex flex-col m-0">
            <p suppressHydrationWarning>{currentDate || "Loading..."}</p>
            <p suppressHydrationWarning className="tabular-nums">
              {currentTime || "Loading..."} Eastern Time
            </p>
            <p>Waterloo, ON, Canada</p>
          </dd>
        </dl>

        {/* About - Columns 4-6 */}
        <dl className="col-span-3 flex flex-col gap-[10px] pr-[4px]">
          <dt className="text-[#b5b5b5]">About</dt>
          <dd className="m-0">Design Waterloo is an open collective committed to advancing design excellence in Waterloo, and letting the world know about it.</dd>
        </dl>

        {/* Email - Columns 7-9 */}
        <dl className="col-span-3 flex flex-col gap-[10px] pr-[4px]">
          <dt className="text-[#b5b5b5]">Email</dt>
          <dd className="m-0">hi@designwaterloo.com</dd>
        </dl>

        {/* Follow - Columns 10-11 */}
        <dl className="col-span-2 flex flex-col gap-[10px]">
          <dt className="text-[#b5b5b5]">Follow</dt>
          <dd className="m-0 flex flex-col gap-[10px]">
            <a href="https://www.instagram.com/designwaterloo/" target="_blank" rel="noopener noreferrer" className={`${linkColor} ${linkHoverColor} underline`}>Instagram</a>
            <a href="https://twitter.com/designwaterloo/" target="_blank" rel="noopener noreferrer" className={`${linkColor} ${linkHoverColor} underline`}>Twitter</a>
            <a href="https://www.linkedin.com/company/designwaterloo/" target="_blank" rel="noopener noreferrer" className={`${linkColor} ${linkHoverColor} underline`}>LinkedIn</a>
          </dd>
        </dl>

        {/* Logo - Column 12 (hidden in menu variant to match Figma) */}
        {variant === "default" && (
          <div className="col-span-1 flex justify-end">
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

      {/* Large horizontal wordmark */}
      <div className="w-full">
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
