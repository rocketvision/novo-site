import { notFound } from "next/navigation";

/** Qualquer URL inexistente dentro do CMS mostra o 404 do próprio CMS (com a sidebar). */
export default function Missing() {
  notFound();
}
