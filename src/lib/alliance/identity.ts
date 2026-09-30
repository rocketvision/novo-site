/**
 * Identidade de uma empresa indicada: as chaves usadas para achar indicações duplicadas.
 * Três sinais independentes. Basta um coincidir para a indicação ser considerada a mesma empresa:
 * - domínio do site (ou do e-mail corporativo do contato);
 * - CNPJ (só dígitos);
 * - nome normalizado (sem acentos, pontuação e sufixos societários).
 */

/** Provedores de e-mail pessoal: o domínio deles não identifica uma empresa. */
const FREE_MAIL = new Set([
  "gmail.com",
  "googlemail.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "msn.com",
  "yahoo.com",
  "yahoo.com.br",
  "icloud.com",
  "me.com",
  "uol.com.br",
  "bol.com.br",
  "terra.com.br",
  "ig.com.br",
  "proton.me",
  "protonmail.com",
]);

/** "https://www.Empresa.com.br/contato" → "empresa.com.br". Devolve null para entradas sem domínio. */
export function normalizeDomain(input: string | null | undefined): string | null {
  const raw = input?.trim().toLowerCase();
  if (!raw) return null;
  let host = raw;
  if (raw.includes("@") && !raw.includes("/")) host = raw.split("@").pop() ?? "";
  else {
    try {
      host = new URL(/^[a-z]+:\/\//.test(raw) ? raw : `https://${raw}`).hostname;
    } catch {
      return null;
    }
  }
  host = host.replace(/^www\d*\./, "").replace(/\.$/, "");
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host)) return null;
  if (FREE_MAIL.has(host)) return null;
  return host;
}

/** Só os dígitos de um CNPJ válido (14 dígitos com verificadores corretos); senão null. */
export function normalizeTaxId(input: string | null | undefined): string | null {
  const d = (input ?? "").replace(/\D/g, "");
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return null;
  const digit = (len: number) => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((acc, w, i) => acc + Number(d[i]) * w, 0);
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return digit(12) === Number(d[12]) && digit(13) === Number(d[13]) ? d : null;
}

export function formatTaxId(digits: string) {
  return digits.length === 14 ? `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}` : digits;
}

const LEGAL_SUFFIXES = /\b(ltda|me|epp|eireli|mei|s\s?\/?\s?a|sa|cia|companhia|comercio|servicos|e|de|da|do|das|dos|limitada|inc|llc)\b/g;

/** "Padaria São João Ltda." → "padaria sao joao". Devolve null se sobrar menos de 3 letras. */
export function normalizeCompanyName(input: string | null | undefined): string | null {
  const s = (input ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s/]/g, " ")
    .replace(LEGAL_SUFFIXES, " ")
    .replace(/[/\s]+/g, " ")
    .trim();
  return s.replace(/\s/g, "").length >= 3 ? s : null;
}

export type CompanyKeys = { domain: string | null; taxId: string | null; nameKey: string | null };

export function companyKeys(input: { companyName: string; website?: string | null; contactEmail?: string | null; taxId?: string | null }): CompanyKeys {
  return {
    domain: normalizeDomain(input.website) ?? normalizeDomain(input.contactEmail),
    taxId: normalizeTaxId(input.taxId),
    nameKey: normalizeCompanyName(input.companyName),
  };
}
