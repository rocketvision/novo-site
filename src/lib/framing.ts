/**
 * Enquadramento de uma fotografia por ponto de foco.
 *
 * Usado quando uma única foto conta mais de um momento (Diferenciais, Como trabalhamos):
 * cada momento aproxima a câmera de um detalhe da mesma imagem.
 *
 * - `x`, `y`: ponto de foco, em porcentagem da imagem (0 a 100).
 * - `scale`: aproximação (1 = a foto inteira no quadro).
 * - `mirror`: espelha a foto na horizontal (x continua medido na imagem já espelhada).
 *
 * O foco é levado ao centro do quadro, mas o deslocamento é limitado para a foto
 * nunca descobrir as bordas do contêiner.
 */
export type Framing = { x: number; y: number; scale: number };

export function framingStyle({ x, y, scale }: Framing, mirror = false): React.CSSProperties {
  const limit = ((scale - 1) / 2) * 100;
  const shift = (focus: number) => Math.max(-limit, Math.min(limit, -scale * (focus - 50)));
  const tx = shift(x);
  const ty = shift(y);
  // No espelho, object-position é medido na imagem original: inverte o eixo horizontal.
  const position = mirror ? 100 - x : x;
  return {
    objectPosition: `${position}% ${y}%`,
    transform: `translate(${tx}%, ${ty}%) scale(${mirror ? -scale : scale}, ${scale})`,
  };
}
