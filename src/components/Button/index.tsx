import Image from "next/image";
import Link from "@/components/Link";
import styles from "./Button.module.css";
import { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  variant?: "primary" | "secondary";
  icon?: string;
  iconAlt?: string;
  onClick?: () => void;
  href?: string;
  target?: "_blank" | "_self";
}

export default function Button({
  children,
  variant = "primary",
  icon,
  onClick,
  href,
  target
}: ButtonProps) {
  const className = `${styles.button} ${variant === "primary" ? styles.primary : styles.secondary}`;
  const content = (
    <>
      <span className={styles.text}>{children}</span>
      {icon && <span className="hidden sm:inline"><Image src={icon} width={24} height={24} alt="" /></span>}
    </>
  );

  if (href) {
    // External link or opens in new tab
    const isExternal = href.startsWith('http') || target === "_blank";
    
    if (isExternal) {
      return (
        <a 
          href={href}
          className={className}
          target={target}
          rel={target === "_blank" ? "noopener noreferrer" : undefined}
        >
          {content}
        </a>
      );
    }

    // Internal link with page transition
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button
      className={className}
      onClick={onClick}
    >
      {content}
    </button>
  );
}

