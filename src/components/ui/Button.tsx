import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "border-ledger-green bg-ledger-green text-ledger-ink hover:bg-[#69e1a6]",
  secondary:
    "border-ledger-line bg-[#1d242b] text-ledger-steel hover:border-[#4d5966] hover:bg-[#252d36]",
  ghost:
    "border-transparent bg-transparent text-[#9aa6b5] hover:bg-[#1d242b] hover:text-ledger-steel",
  danger:
    "border-[#5b3232] bg-[#2a1718] text-[#ffb5b5] hover:border-[#7a4545]",
};

const Button = ({ variant = "primary", className = "", children, ...props }: ButtonProps) => (
  <button
    className={`inline-flex min-h-11 items-center justify-center gap-2 rounded border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
    {...props}
  >
    {children}
  </button>
);

export default Button;
