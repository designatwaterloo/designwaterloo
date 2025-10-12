import Image from "next/image";
import styles from "./Button.module.css";

interface ButtonProps {
  text: string;
  variant?: "primary" | "secondary";
  icon?: string;
  iconAlt?: string;
  onClick?: () => void;
}

export default function Button({ 
  text, 
  variant = "primary", 
  icon, 
  onClick 
}: ButtonProps) {
  return (
    <button 
      className={`${styles.button} ${variant === "primary" ? styles.primary : styles.secondary}`}
      onClick={onClick}
    >
      <span className={styles.text}>{text}</span>
      {icon && <Image src={icon} width={24} height={24} alt="" />}
    </button>
  );
}

