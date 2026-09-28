"use client";

import { m, type Variants } from "motion/react";
import { revealDistance, stagger as staggerToken, transition } from "@/lib/motion";

type Tag = "div" | "li" | "ul" | "ol" | "p" | "span" | "h2" | "h3" | "article";

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  as?: Tag;
  delay?: number;
  /** Deslocamento vertical inicial em pixels. */
  y?: number;
};

const viewport = { once: true, margin: "0px 0px -12% 0px" } as const;

/** Fade + translate suave quando o elemento entra na tela. Usado em toda a página. */
export function Reveal({ children, className, as = "div", delay = 0, y = revealDistance }: RevealProps) {
  const Component = m[as];
  return (
    <Component
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={viewport}
      transition={{ ...transition.reveal, delay }}
    >
      {children}
    </Component>
  );
}

const groupVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: staggerToken } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: revealDistance },
  visible: { opacity: 1, y: 0, transition: transition.reveal },
};

/** Container que revela os filhos (RevealItem) em sequência. */
export function RevealGroup({
  children,
  className,
  as = "div",
  immediate = false,
}: {
  children: React.ReactNode;
  className?: string;
  as?: Tag;
  /** Anima ao montar, sem esperar entrar na tela. Usado no Hero. */
  immediate?: boolean;
}) {
  const Component = m[as];
  return (
    <Component
      className={className}
      variants={groupVariants}
      initial="hidden"
      {...(immediate ? { animate: "visible" } : { whileInView: "visible", viewport })}
    >
      {children}
    </Component>
  );
}

export function RevealItem({ children, className, as = "div" }: { children: React.ReactNode; className?: string; as?: Tag }) {
  const Component = m[as];
  return (
    <Component className={className} variants={itemVariants}>
      {children}
    </Component>
  );
}
