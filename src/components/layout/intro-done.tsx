"use client";

import { useEffect } from "react";

/**
 * Marca o fim da abertura. Depois disso, a entrada dos títulos deixa de esperar
 * a cortina: navegar entre rotas pelo menu mostra o conteúdo na hora.
 */
export function IntroDone() {
  useEffect(() => {
    const id = window.setTimeout(() => document.documentElement.classList.add("intro-done"), 1700);
    return () => window.clearTimeout(id);
  }, []);
  return null;
}
