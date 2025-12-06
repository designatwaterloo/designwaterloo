import Image from "next/image";
import Link from "@/components/Link";
import styles from "./Button.module.css";
import { ReactNode } from "react";

interface ButtonProps {
  children?: ReactNode;
  variant?: "primary" | "secondary" | "icon" | "small";
  icon?: string;
  iconAlt?: string;
  active?: boolean;
  onClick?: () => void;
  href?: string;
  target?: "_blank" | "_self";
}

export default function Button({
  children,
  variant = "primary",
  icon,
  iconAlt = "",
  active = false,
  onClick,
  href,
  target
}: ButtonProps) {
  const variantClass = variant === "primary"
    ? styles.primary
    : variant === "secondary"
      ? styles.secondary
      : variant === "icon"
        ? styles.icon
        : styles.small;
  const activeClass = active ? styles.active : "";
  const className = `${styles.button} ${variantClass} ${activeClass}`;
  
  // Icon-only variant
  if (variant === "icon" && icon) {
    /* eslint-disable-next-line @next/next/no-img-element */
    const iconContent = <img src={icon} width={20} height={20} alt={iconAlt} />;
    
    if (href) {
      const isExternal = href.startsWith('http') || target === "_blank";
      if (isExternal) {
        return (
          <a href={href} className={className} target={target} rel={target === "_blank" ? "noopener noreferrer" : undefined}>
            {iconContent}
          </a>
        );
      }
      return <Link href={href} className={className}>{iconContent}</Link>;
    }
    
    return <button className={className} onClick={onClick}>{iconContent}</button>;
  }
  
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

