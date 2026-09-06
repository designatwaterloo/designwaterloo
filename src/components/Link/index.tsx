"use client";

import NextLink from "next/link";
import { triggerHaptic } from "@/lib/haptics";
import { ComponentProps } from "react";

type LinkProps = ComponentProps<typeof NextLink> & { underline?: boolean };

/** Navigation belongs to Next, including pending states, modifiers, hashes and history. */
export default function Link({ onClick, underline = true, style, ...props }: LinkProps) {
  return <NextLink {...props} style={{ textDecoration: underline ? undefined : 'none', ...style }}
    onClick={event => {
      onClick?.(event);
      if (!event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) triggerHaptic();
    }} />;
}
