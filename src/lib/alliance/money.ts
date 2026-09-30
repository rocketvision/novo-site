/**
 * Dinheiro do Rocket Alliance: sempre em centavos inteiros, nunca em ponto flutuante.
 * Percentuais em pontos-base (1% = 100 bp; 5% = 500 bp), também inteiros.
 *
 * O arredondamento da comissão é "meio para cima" sobre o valor absoluto (o estorno de uma comissão
 * arredonda igual à comissão original, só com o sinal trocado).
 */

export const MAX_CENTS = 10_000_000_000_00; // R$ 10 bilhões: teto de sanidade para qualquer valor.

/** Comissão = base × taxa, em centavos, arredondada ao centavo. */
export function commissionCents(baseCents: number, rateBp: number) {
  if (!Number.isSafeInteger(baseCents) || !Number.isInteger(rateBp)) throw new Error("Valores inválidos para cálculo de comissão.");
  if (rateBp < 0 || rateBp > 10_000) throw new Error("Taxa fora do intervalo.");
  const sign = baseCents < 0 ? -1 : 1;
  // base × bp pode passar de Number.MAX_SAFE_INTEGER perto do teto (10^12 × 10^4 = 10^16 > 2^53):
  // a multiplicação e o arredondamento são feitos em BigInt, sem perda.
  const product = BigInt(Math.abs(baseCents)) * BigInt(rateBp);
  const rounded = (product + BigInt(5_000)) / BigInt(10_000);
  return sign * Number(rounded);
}

/** "1.234,56", "1234.56", "R$ 1.234,56" ou "1234" → centavos. Devolve null se não for um valor válido. */
export function parseMoney(input: string | number): number | null {
  if (typeof input === "number") return Number.isFinite(input) ? Math.round(input * 100) : null;
  let s = input.trim().replace(/^R\$\s*/i, "").replace(/\s/g, "");
  if (!s) return null;
  const negative = s.startsWith("-");
  if (negative) s = s.slice(1);
  if (!/^[\d.,]+$/.test(s)) return null;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  let integer: string;
  let fraction = "";
  if (lastComma > -1 && lastComma > lastDot) {
    // Formato brasileiro: vírgula decimal, pontos de milhar.
    integer = s.slice(0, lastComma).replace(/\./g, "");
    fraction = s.slice(lastComma + 1);
  } else if (lastDot > -1 && s.length - lastDot - 1 <= 2 && lastComma === -1 && s.split(".").length === 2) {
    // Um único ponto com até 2 casas depois: decimal.
    integer = s.slice(0, lastDot);
    fraction = s.slice(lastDot + 1);
  } else {
    integer = s.replace(/[.,]/g, "");
  }
  if (!/^\d+$/.test(integer || "0") || !/^\d{0,2}$/.test(fraction)) return null;
  const cents = Number(integer || "0") * 100 + Number((fraction + "00").slice(0, 2));
  if (!Number.isSafeInteger(cents) || cents > MAX_CENTS) return null;
  return negative ? -cents : cents;
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** Centavos → "R$ 1.234,56". */
export function formatMoney(cents: number) {
  return brl.format(cents / 100).replace(/ /g, " ");
}

/** Pontos-base → "5%" ou "7,5%". */
export function formatRate(bp: number) {
  const pct = bp / 100;
  return `${pct.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

/** "5", "7,5", "7.5%" → pontos-base. */
export function parseRate(input: string): number | null {
  const s = input.trim().replace("%", "").replace(",", ".");
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(s)) return null;
  const bp = Math.round(Number(s) * 100);
  return bp >= 0 && bp <= 10_000 ? bp : null;
}
