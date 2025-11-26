"use client";

import NextLink from "next/link";
import { useTransition } from "@/context/TransitionContext";
import { usePathname } from "next/navigation";
import { ComponentProps } from "react";

type LinkProps = ComponentProps<typeof NextLink>;

export default function Link({ href, onClick, ...props }: LinkProps) {
  const { startTransition } = useTransition();
  const pathname = usePathname();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Call any passed onClick first
    onClick?.(e);

    // Only intercept internal links (not hash links or external)
    if (typeof href === "string" && href.startsWith("/") && !href.startsWith("/#")) {
      // Don't trigger transition if already on this page

      e.preventDefault();
      startTransition(href);
    }
    // External links, hash links, and Link objects work normally
  };

  return <NextLink href={href} onClick={handleClick} {...props} />;
}
