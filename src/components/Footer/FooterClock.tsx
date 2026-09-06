"use client";
import { useState, useEffect } from "react";

export default function FooterClock() {
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

  return (
        <dl className="flex flex-col gap-[10px] sm:col-span-3 sm:pr-[4px]">
          <dt className="text-muted-light">Local Time</dt>
          <dd className="flex flex-col m-0">
            <p>{currentDate || "Loading..."}</p>
            <p className="tabular-nums">
              {currentTime || "Loading..."} Eastern Time
            </p>
            <p>Waterloo, ON, Canada</p>
          </dd>
        </dl>
  );
}
