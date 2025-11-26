"use client";

import NextLink from "next/link";
import { useTransition } from "@/context/TransitionContext";
import { ComponentProps } from "react";

type LinkProps = ComponentProps<typeof NextLink> & {
  underline?: boolean;
};

export default function Link({ href, onClick, underline = true, className, style, ...props }: LinkProps) {
  const { startTransition } = useTransition();

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

  const linkStyle = {
    textDecoration: underline ? undefined : 'none',
    ...style,
  };

  return <NextLink href={href} onClick={handleClick} className={className} style={linkStyle} {...props} />;
}
