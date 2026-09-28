import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "inverse" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const base =
  "group/button relative inline-flex select-none items-center justify-center gap-2 rounded-full font-medium tracking-[-0.01em] whitespace-nowrap transition-[background-color,color,box-shadow,transform] duration-300 ease-out active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-white hover:bg-graphite shadow-[0_1px_0_rgb(255_255_255/0.12)_inset,0_8px_24px_-12px_rgb(0_0_0/0.5)]",
  inverse: "bg-white text-ink hover:bg-mist",
  secondary: "text-graphite hover:text-ink ring-1 ring-inset ring-black/12 hover:ring-black/25 bg-transparent",
  ghost: "text-current hover:opacity-70",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-[0.9375rem]",
  lg: "h-13 px-7 text-base",
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: { variant?: Variant; size?: Size; className?: string } = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
};

/** Link com aparência de botão. O ícone desliza levemente no hover. */
export function ButtonLink({ variant, size, icon, className, children, ...props }: ButtonLinkProps) {
  return (
    <Link className={buttonClasses({ variant, size, className })} {...props}>
      <span>{children}</span>
      {icon && (
        <span className="-mr-1 inline-flex transition-transform duration-300 ease-out group-hover/button:translate-x-0.5">
          {icon}
        </span>
      )}
    </Link>
  );
}
