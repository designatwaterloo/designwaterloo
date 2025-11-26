import Image from "next/image";
import styles from "./Button.module.css";
import { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  variant?: "primary" | "secondary";
  icon?: string;
  iconAlt?: string;
  onClick?: () => void;
}

export default function Button({
  children,
  variant = "primary",
  icon,
  onClick
}: ButtonProps) {
  return (
    <button
      className={`${styles.button} ${variant === "primary" ? styles.primary : styles.secondary}`}
      onClick={onClick}
    >
      <span className={styles.text}>{children}</span>
      {icon && <Image src={icon} width={24} height={24} alt="" />}
    </button>
  );
}

