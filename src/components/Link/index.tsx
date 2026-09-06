"use client";

import NextLink from "next/link";
import { useTransition } from "@/context/TransitionContext";
import { triggerHaptic } from "@/lib/haptics";
import { ComponentProps } from "react";
import { isAccountDestination } from "@/lib/navigation";

type LinkProps = ComponentProps<typeof NextLink> & {
  underline?: boolean;
};

export default function Link({ href, onClick, underline = true, className, style, ...props }: LinkProps) {
  const { startTransition } = useTransition();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Call any passed onClick first
    onClick?.(e);

    // Preserve native cancellation, modified clicks, URL objects and account navigation.
    // Those must not enqueue a delayed router.push behind the curtain.
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey ||
        props.target === "_blank" || props.download || typeof href !== "string") return;
    if (isAccountDestination(href)) {
      triggerHaptic();
      return;
    }
    if (href.startsWith("/") && !href.startsWith("//") && !href.includes("#")) {
      e.preventDefault();
      triggerHaptic();
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
