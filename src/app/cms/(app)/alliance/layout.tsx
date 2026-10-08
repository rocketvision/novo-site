import { requirePermission } from "@/server/authz/guard";

/**
 * Área Rocket Alliance do Studio. Ver a área exige `alliance.view`; cada seção exige a permissão da
 * própria área (finanças, contratos e configurações são separadas), e cada página e rota confere de novo.
 * A navegação entre as seções fica no menu lateral.
 */
export default async function AllianceLayout({ children }: { children: React.ReactNode }) {
  await requirePermission("alliance.view", "/cms/alliance");
  return children;
}
