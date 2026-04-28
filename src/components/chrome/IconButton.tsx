import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./IconButton.module.css";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  "aria-label": string;
  children: ReactNode;
}

export function IconButton({ children, className, ...rest }: IconButtonProps) {
  const composed = className ? `${styles.btn} ${className}` : styles.btn;
  return (
    <button type="button" className={composed} {...rest}>
      {children}
    </button>
  );
}
