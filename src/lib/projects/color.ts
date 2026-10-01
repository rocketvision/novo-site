/** Contraste WCAG entre duas cores hex, para avisar quando o texto some sobre a cor da marca. */
export function contrastRatio(a: string, b: string) {
  const lum = (hexColor: string) => {
    const n = parseInt(hexColor.slice(1), 16);
    const [r, g, bl] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/**
 * A cor de destaque do projeto, só quando ela fica legível sobre o fundo (3:1, o mínimo para ícones e
 * textos grandes). Sem contraste, devolve undefined e o elemento fica com a cor de texto da página.
 */
export function readableAccent(accent: string, background: string, min = 3) {
  return contrastRatio(accent, background) >= min ? accent : undefined;
}
