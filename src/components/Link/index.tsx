"use client";

import NextLink from "next/link";
import { useTransitionRouter } from "next-view-transitions";
import { usePathname } from "next/navigation";
import { ComponentProps } from "react";

type LinkProps = ComponentProps<typeof NextLink>;

export default function Link({ href, onClick, ...props }: LinkProps) {
  const router = useTransitionRouter();
  const pathname = usePathname();

  function slideInOut() {
    document.documentElement.animate(
      [
        {
          opacity: 1,
          transform: "translateY(0)",
        },
        {
          opacity: 0.2,
          transform: "translateY(35%)",
        },
      ], {
        duration: 1500,
        easing: "cubic-bezier(0.87, 0, 0.13, 1)",
        fill: "forwards",
        pseudoElement: "::view-transition-old(root)",
      }
    )

    document.documentElement.animate([
      {
        clipPath: "polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)",
      },
      {
        clipPath: "polygon(0% 100%, 100% 100%, 100% 0%, 0% 0%)",
      }
    ], {
      duration: 1500,
      easing: "cubic-bezier(0.87, 0, 0.13, 1)",
      fill: "forwards",
      pseudoElement: "::view-transition-new(root)",
    })
  }

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Call any passed onClick first
    onClick?.(e);

    // Only intercept internal links (not hash links or external)
    if (typeof href === "string" && href.startsWith("/") && !href.startsWith("/#")) {
      // Don't trigger transition if already on this page
      if (href === pathname) {
        e.preventDefault();
        return;
      }

      e.preventDefault();
      router.push(href, {
        onTransitionReady: slideInOut,
      });
    }
    // External links, hash links, and Link objects work normally
  };

  return <NextLink href={href} onClick={handleClick} {...props} />;
}
