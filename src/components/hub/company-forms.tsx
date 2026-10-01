"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageUp, Plus, X } from "lucide-react";
import { Button } from "@/components/cms/ui/button";
import { ConfirmDialog } from "@/components/cms/ui/dialog";
import { Field, Input, Textarea } from "@/components/cms/ui/field";
import { useToast } from "@/components/cms/ui/toast";
import { api, ApiError } from "@/lib/cms/api";
import { maskPhone } from "@/lib/diagnostic";

type PublicData = {
  tradeName: string;
  shortDescription: string;
  description: string;
  websiteUrl: string;
  location: string;
  specialties: string[];
  services: string[];
  socialLinks: { label: string; url: string }[];
  logoMediaId: string | null;
};

/** Dados públicos da empresa: vão para a Rocket aprovar antes de aparecer no site. */
export function PublicDataForm({ initial, logoUrl, pending }: { initial: PublicData; logoUrl: string | null; pending: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [v, setV] = useState(initial);
  const [logo, setLogo] = useState(logoUrl);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<null | "save" | "logo">(null);
  const file = useRef<HTMLInputElement>(null);
  const dirty = JSON.stringify(v) !== JSON.stringify(initial);

  async function upload(f: File) {
    setBusy("logo");
    try {
      const form = new FormData();
      form.append("file", f);
      const r = await api<{ id: string; url: string }>("/api/alliance/hub/company/logo", { formData: form });
      setV((x) => ({ ...x, logoMediaId: r.id }));
      setLogo(r.url);
    } catch (e) {
      toast.error((e as ApiError).message);
    } finally {
      setBusy(null);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy("save");
    setErrors({});
    try {
      await api("/api/alliance/hub/company/changes", { body: v });
      toast.success("Alterações enviadas para aprovação da Rocket Vision.");
      router.refresh();
    } catch (err) {
      setErrors((err as ApiError).fields ?? {});
      toast.error((err as ApiError).message);
    } finally {
      setBusy(null);
    }
  }

  const list = (key: "specialties" | "services", label: string, max: number) => (
    <fieldset>
      <legend className="mb-1.5 text-[13px] font-medium text-zinc-900">{label}</legend>
      <div className="space-y-2">
        {v[key].map((item, i) => (
          <div key={i} className="flex gap-2">
            <Input aria-label={`${label} ${i + 1}`} value={item} maxLength={60} onChange={(e) => setV((x) => ({ ...x, [key]: x[key].map((y, j) => (j === i ? e.target.value : y)) }))} />
            <Button variant="ghost" size="sm" aria-label={`Remover ${label.toLowerCase()} ${i + 1}`} onClick={() => setV((x) => ({ ...x, [key]: x[key].filter((_, j) => j !== i) }))}>
              <X className="size-4" />
            </Button>
          </div>
        ))}
        {v[key].length < max && (
          <Button variant="secondary" size="sm" onClick={() => setV((x) => ({ ...x, [key]: [...x[key], ""] }))}>
            <Plus className="size-3.5" /> Adicionar
          </Button>
        )}
      </div>
      {errors[key] && <p className="mt-1.5 text-[13px] text-red-600">{errors[key]}</p>}
    </fieldset>
  );

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {pending && <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-900">Há um pedido de alteração aguardando aprovação. Enviar outro substitui o anterior.</p>}
      <div className="flex items-center gap-4">
        <span className="flex h-16 w-32 items-center justify-center overflow-hidden rounded-md border border-zinc-200 bg-zinc-50">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="Logotipo" className="max-h-12 max-w-28 object-contain" />
          ) : (
            <span className="text-xs text-zinc-400">Sem logotipo</span>
          )}
        </span>
        <div>
          <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          <Button variant="secondary" size="sm" loading={busy === "logo"} onClick={() => file.current?.click()}>
            <ImageUp className="size-3.5" /> Enviar logotipo
          </Button>
          <p className="mt-1 text-xs text-zinc-500">PNG com fundo transparente, em alta resolução.</p>
        </div>
      </div>
      <Field label="Nome comercial" error={errors.tradeName}>
        {(p) => <Input {...p} value={v.tradeName} maxLength={80} onChange={(e) => setV({ ...v, tradeName: e.target.value })} />}
      </Field>
      <Field label="Descrição curta" error={errors.shortDescription} counter={{ value: v.shortDescription.length, max: 220 }}>
        {(p) => <Textarea {...p} rows={2} value={v.shortDescription} maxLength={220} onChange={(e) => setV({ ...v, shortDescription: e.target.value })} />}
      </Field>
      <Field label="Descrição completa" error={errors.description} counter={{ value: v.description.length, max: 4000 }}>
        {(p) => <Textarea {...p} rows={5} value={v.description} maxLength={4000} onChange={(e) => setV({ ...v, description: e.target.value })} />}
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Site" error={errors.websiteUrl}>
          {(p) => <Input {...p} value={v.websiteUrl} maxLength={300} onChange={(e) => setV({ ...v, websiteUrl: e.target.value })} />}
        </Field>
        <Field label="Localização" optional error={errors.location}>
          {(p) => <Input {...p} value={v.location} maxLength={80} onChange={(e) => setV({ ...v, location: e.target.value })} />}
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        {list("specialties", "Especialidades", 12)}
        {list("services", "Serviços", 12)}
      </div>
      <fieldset>
        <legend className="mb-1.5 text-[13px] font-medium text-zinc-900">Redes sociais</legend>
        <div className="space-y-2">
          {v.socialLinks.map((s, i) => (
            <div key={i} className="grid grid-cols-[8rem_1fr_auto] gap-2">
              <Input aria-label="Rede" placeholder="LinkedIn" value={s.label} maxLength={30} onChange={(e) => setV((x) => ({ ...x, socialLinks: x.socialLinks.map((y, j) => (j === i ? { ...y, label: e.target.value } : y)) }))} />
              <Input aria-label="Link" placeholder="https://" value={s.url} maxLength={500} onChange={(e) => setV((x) => ({ ...x, socialLinks: x.socialLinks.map((y, j) => (j === i ? { ...y, url: e.target.value } : y)) }))} />
              <Button variant="ghost" size="sm" aria-label="Remover rede" onClick={() => setV((x) => ({ ...x, socialLinks: x.socialLinks.filter((_, j) => j !== i) }))}>
                <X className="size-4" />
              </Button>
            </div>
          ))}
          {v.socialLinks.length < 8 && (
            <Button variant="secondary" size="sm" onClick={() => setV((x) => ({ ...x, socialLinks: [...x.socialLinks, { label: "", url: "" }] }))}>
              <Plus className="size-3.5" /> Adicionar rede
            </Button>
          )}
        </div>
      </fieldset>
      <Button type="submit" loading={busy === "save"} disabled={!dirty}>
        Enviar para aprovação
      </Button>
    </form>
  );
}

/** Contato principal: interno, atualizado na hora (não aparece no site). */
export function ContactForm({ initial }: { initial: { contactName: string; contactEmail: string; contactPhone: string } }) {
  const router = useRouter();
  const toast = useToast();
  const [v, setV] = useState({ ...initial, contactPhone: maskPhone(initial.contactPhone) });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      await api("/api/alliance/hub/company", { method: "PATCH", body: v });
      toast.success("Contato atualizado.");
      router.refresh();
    } catch (err) {
      setErrors((err as ApiError).fields ?? {});
      toast.error((err as ApiError).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Field label="Nome" error={errors.contactName}>{(p) => <Input {...p} value={v.contactName} maxLength={80} onChange={(e) => setV({ ...v, contactName: e.target.value })} />}</Field>
      <Field label="E-mail" error={errors.contactEmail}>{(p) => <Input {...p} type="email" value={v.contactEmail} maxLength={160} onChange={(e) => setV({ ...v, contactEmail: e.target.value })} />}</Field>
      <Field label="Telefone" error={errors.contactPhone}>{(p) => <Input {...p} type="tel" value={v.contactPhone} maxLength={16} onChange={(e) => setV({ ...v, contactPhone: maskPhone(e.target.value) })} />}</Field>
      <Button type="submit" variant="secondary" loading={busy}>
        Salvar contato
      </Button>
    </form>
  );
}

/** Aceite de termo pelo Responsável: exige marcar que leu; o servidor confere que o texto é o mesmo. */
export function AcceptContract({ id, title, hash }: { id: string; title: string; hash: string }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  async function accept() {
    setBusy(true);
    try {
      await api(`/api/alliance/hub/contracts/${id}/accept`, { body: { termsSha256: hash, confirm: true } });
      toast.success("Termo aceito. Obrigado!");
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        Aceitar termo
      </Button>
      <ConfirmDialog open={open} tone="primary" title={`Aceitar "${title}"?`} description="O aceite fica registrado com o seu nome, data, hora e a versão do texto." confirmLabel="Aceitar" loading={busy} onConfirm={() => (checked ? accept() : toast.error("Marque que leu o documento para aceitar."))} onClose={() => setOpen(false)}>
        <label className="flex items-start gap-2 text-[13px] text-zinc-700">
          <input type="checkbox" className="mt-0.5 size-4 accent-zinc-900" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
          Li o documento e aceito em nome da empresa.
        </label>
      </ConfirmDialog>
    </>
  );
}
