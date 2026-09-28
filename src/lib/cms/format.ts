/** Formatação de datas do CMS em pt-BR, relativa quando recente ("há 2 horas"). */
const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
const full = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
const day = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "America/Sao_Paulo" });

export function relativeTime(date: Date | string, now = Date.now()) {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.round((d.getTime() - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 45) return "agora";
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), "hour");
  if (abs < 86400 * 7) return rtf.format(Math.round(seconds / 86400), "day");
  return full.format(d);
}

export const formatDateTime = (date: Date | string) => full.format(typeof date === "string" ? new Date(date) : date);
export const formatDay = (date: Date | string) => day.format(typeof date === "string" ? new Date(date) : date);

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}
