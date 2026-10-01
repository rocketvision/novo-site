"use client";

import { useEffect } from "react";

/**
 * Marca o fim da abertura em dois tempos:
 * - `intro-done` (1,7 s): a cortina subiu. O vídeo do foguete decola a partir daqui.
 * - `intro-settled` (4,5 s): as entradas da primeira tela já terminaram. Só então os títulos deixam
 *   de esperar a cortina (navegar pelo menu mostra o conteúdo na hora). Antes disso, mudar o atraso
 *   das animações em andamento fazia tudo saltar de uma vez.
 */
export function IntroDone() {
  useEffect(() => {
    const root = document.documentElement;
    const done = window.setTimeout(() => root.classList.add("intro-done"), 1700);
    const settled = window.setTimeout(() => root.classList.add("intro-settled"), 4500);
    return () => {
      window.clearTimeout(done);
      window.clearTimeout(settled);
    };
  }, []);
  return null;
}
