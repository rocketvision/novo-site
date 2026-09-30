import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, Panel } from "@/components/cms/ui/layout";
import { ModalityForm, ProgramSettingsForm, TierForm } from "@/components/cms/alliance/settings-admin";
import { requirePermission } from "@/server/authz/guard";
import { getProgramSettings, listModalities, listTiers } from "@/server/alliance/settings";

export const metadata: Metadata = { title: "Configurações · Rocket Alliance" };

export default async function AllianceSettingsPage() {
  await requirePermission("alliance.settings", "/cms/alliance/configuracoes");
  const [{ version, ...settings }, modalities, tiers] = await Promise.all([getProgramSettings(), listModalities(), listTiers()]);
  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title="Configurações do programa"
        description={
          <>
            Parâmetros operacionais, modalidades e níveis. Percentuais de comissão ficam em{" "}
            <Link href="/cms/alliance/comissoes/regras" className="underline underline-offset-4">
              Regras de comissão
            </Link>
            , com aprovação comercial.
          </>
        }
      />
      <Panel title="Parâmetros">
        <ProgramSettingsForm initial={settings} version={version} />
      </Panel>
      <Panel title="Modalidades" description="Os nomes e descrições oficiais vêm preenchidos. Mudanças aparecem no site e no formulário de candidatura.">
        <div className="-my-2 divide-y divide-zinc-100">
          {modalities.map((m) => (
            <details key={m.key} className="py-3">
              <summary className="cursor-pointer text-sm font-medium text-zinc-900">
                {m.name} {!m.isActive && <span className="ml-1 text-xs font-normal text-zinc-500">(fora de candidaturas)</span>}
              </summary>
              <div className="mt-3">
                <ModalityForm modalityKey={m.key} initial={{ name: m.name, description: m.description, isActive: m.isActive }} />
              </div>
            </details>
          ))}
        </div>
      </Panel>
      <Panel title="Níveis" description="Critérios de evolução e benefícios de cada nível. A mudança de nível de um parceiro é feita na página dele.">
        <div className="-my-2 divide-y divide-zinc-100">
          {tiers.map((t) => (
            <details key={t.key} className="py-3">
              <summary className="cursor-pointer text-sm font-medium text-zinc-900">
                {t.name} <span className="ml-1 text-xs font-normal text-zinc-500">{t.label}</span>
              </summary>
              <div className="mt-3">
                <TierForm tierKey={t.key} initial={{ name: t.name, label: t.label, description: t.description, benefits: t.benefits }} />
              </div>
            </details>
          ))}
        </div>
      </Panel>
    </div>
  );
}
