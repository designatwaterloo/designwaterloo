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
    const path = typeof href === "string" ? href : href?.pathname ?? null;
    if (typeof path === "string" && path.startsWith("/") && !path.startsWith("/#")) {
      e.preventDefault();
      startTransition(path);
    }
    // External links, hash links, and Link objects work normally
  };

  const linkStyle = {
    textDecoration: underline ? undefined : 'none',
    ...style,
  };

  return <NextLink href={href} onClick={handleClick} className={className} style={linkStyle} {...props} />;
}
