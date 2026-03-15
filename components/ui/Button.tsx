"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  className,
  disabled,
  onClick,
  ...props
}: ButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(8);
    onClick?.(e);
  };

  const variants = {
    primary:   "bg-primary text-white hover:bg-primary/90 active:bg-primary/80 shadow-sm",
    secondary: "bg-text text-white hover:bg-text/90 active:bg-text/80",
    outline:   "bg-transparent border-2 border-border text-text hover:border-primary hover:text-primary",
    ghost:     "bg-transparent text-text hover:bg-text/5 active:bg-text/10",
    danger:    "bg-error text-white hover:bg-error/90 active:bg-error/80",
  };

  const sizes = {
    sm: "px-4 py-2 text-sm rounded-xl gap-1.5",
    md: "px-6 py-3 text-base rounded-xl gap-2",
    lg: "px-8 py-4 text-lg rounded-2xl gap-2.5",
  };

  return (
    <motion.button
      whileTap={{ scale: disabled || loading ? 1 : 0.97 }}
      whileHover={{ scale: disabled || loading ? 1 : 1.01 }}
      onClick={handleClick}
      disabled={disabled || loading}
      className={cn(
        "relative font-semibold transition-colors duration-200",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "flex items-center justify-center",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className
      )}
      type={props.type || "button"}
      {...(props as any)}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
      {children}
    </motion.button>
  );
}

// Keep old name as alias so existing imports don't break
export { Button as ParchiButton };
