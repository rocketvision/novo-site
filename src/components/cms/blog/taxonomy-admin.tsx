"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ImageIcon, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/cms/ui/button";
import { ConfirmDialog } from "@/components/cms/ui/dialog";
import { Field, Input, Select, Switch, Textarea } from "@/components/cms/ui/field";
import { Badge, EmptyState, Panel } from "@/components/cms/ui/layout";
import { useToast } from "@/components/cms/ui/toast";
import { MediaPicker } from "@/components/cms/media/media-picker";
import { api, ApiError } from "@/lib/cms/api";
import { slugify } from "@/lib/validation/projects";
import type { AuthorInput, CategoryInput, OwnAuthorProfile } from "@/lib/validation/blog";

/* -------------------------------------------------------------------------- */
/* Categorias                                                                   */
/* -------------------------------------------------------------------------- */

export type CategoryDTO = CategoryInput & { id: string; version: number; articles: number };

export function CategoriesAdmin({ categories }: { categories: CategoryDTO[] }) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState<CategoryDTO | "new" | null>(null);
  const [removing, setRemoving] = useState<CategoryDTO | null>(null);
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!removing) return;
    setBusy(true);
    try {
      await api(`/api/cms/blog/categories/${removing.id}`, { method: "DELETE" });
      toast.success("Categoria excluída.");
      setRemoving(null);
      router.refresh();
    } catch (e) {
      toast.error((e as ApiError).message);
      setRemoving(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setEditing("new")}>
          <Plus className="size-4" /> Nova categoria
        </Button>
      </div>
      {editing && (
        <CategoryForm
          initial={editing === "new" ? null : editing}
          nextOrder={Math.max(0, ...categories.map((c) => c.sortOrder)) + 1}
          onDone={() => {
            setEditing(null);
            router.refresh();
          }}
          onCancel={() => setEditing(null)}
        />
      )}
      {categories.length === 0 ? (
        <EmptyState title="Nenhuma categoria." />
      ) : (
        <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white">
          {categories.map((c) => (
            <li key={c.id} className="flex items-center gap-4 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-900">{c.name}</p>
                <p className="truncate text-[13px] text-zinc-500">
                  /blog/categoria/{c.slug} · {c.articles} {c.articles === 1 ? "artigo" : "artigos"}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setEditing(c)} aria-label={`Editar ${c.name}`}>
                <Pencil className="size-3.5" />
              </Button>
              <Button size="sm" variant="ghost" className="text-red-700 hover:bg-red-50" disabled={c.articles > 0} title={c.articles > 0 ? "Mova os artigos antes de excluir" : undefined} onClick={() => setRemoving(c)} aria-label={`Excluir ${c.name}`}>
                <Trash2 className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog open={removing !== null} title="Excluir a categoria?" description="Ela some do Blog. Esta ação não pode ser desfeita." confirmLabel="Excluir" loading={busy} onConfirm={remove} onClose={() => setRemoving(null)} />
    </div>
  );
}

function CategoryForm({ initial, nextOrder, onDone, onCancel }: { initial: CategoryDTO | null; nextOrder: number; onDone: () => void; onCancel: () => void }) {
  const toast = useToast();
  const [data, setData] = useState<CategoryInput>(initial ? { name: initial.name, slug: initial.slug, description: initial.description, sortOrder: initial.sortOrder } : { name: "", slug: "", description: "", sortOrder: nextOrder });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      if (initial) await api(`/api/cms/blog/categories/${initial.id}`, { method: "PUT", body: { version: initial.version, data } });
      else await api("/api/cms/blog/categories", { body: { data } });
      toast.success(initial ? "Categoria salva." : "Categoria criada.");
      onDone();
    } catch (e) {
      const err = e as ApiError;
      setErrors(Object.fromEntries(Object.entries(err.fields).map(([k, v]) => [k.replace(/^data\./, ""), v])));
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title={initial ? `Editar ${initial.name}` : "Nova categoria"}>
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Field label="Nome" error={errors.name}>
          {(p) => <Input {...p} value={data.name} maxLength={40} onChange={(e) => setData((d) => ({ ...d, name: e.target.value, slug: initial ? d.slug : slugify(e.target.value) }))} />}
        </Field>
        <Field label="Endereço" error={errors.slug}>
          {(p) => <Input {...p} value={data.slug} maxLength={90} onChange={(e) => setData((d) => ({ ...d, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") }))} />}
        </Field>
        <Field label="Descrição" optional error={errors.description} className="sm:col-span-2">
          {(p) => <Textarea {...p} rows={2} value={data.description} maxLength={200} onChange={(e) => setData((d) => ({ ...d, description: e.target.value }))} />}
        </Field>
        <Field label="Ordem" error={errors.sortOrder}>
          {(p) => <Input {...p} type="number" min={0} max={1000} value={data.sortOrder} onChange={(e) => setData((d) => ({ ...d, sortOrder: Number(e.target.value) || 0 }))} />}
        </Field>
        <div className="flex items-end justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" loading={busy}>
            Salvar
          </Button>
        </div>
      </form>
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */
/* Autores                                                                      */
/* -------------------------------------------------------------------------- */

export type AuthorDTO = AuthorInput & { id: string; version: number; articles: number; userEmail: string | null; photoUrl: string | null };

type PhotoPreview = { id: string; url: string } | null;

/** Foto, cargo, bio e links: comum ao cadastro de autores e ao perfil do próprio autor. */
function ProfileFields({
  data,
  set,
  errors,
  photo,
  onPhoto,
}: {
  data: OwnAuthorProfile;
  set: (patch: Partial<OwnAuthorProfile>) => void;
  errors: Record<string, string>;
  photo: PhotoPreview;
  onPhoto: (p: PhotoPreview) => void;
}) {
  const [picking, setPicking] = useState(false);
  return (
    <>
      <div className="flex items-center gap-4 sm:col-span-2">
        <div className="relative size-16 shrink-0 overflow-hidden rounded-full bg-zinc-100 ring-1 ring-zinc-200">
          {photo ? <Image src={photo.url} alt="" fill sizes="64px" className="object-cover" /> : <ImageIcon className="absolute inset-0 m-auto size-5 text-zinc-400" aria-hidden="true" />}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setPicking(true)}>
            {photo ? "Trocar foto" : "Escolher foto"}
          </Button>
          {photo && (
            <Button size="sm" variant="ghost" onClick={() => (onPhoto(null), set({ photoMediaId: null }))}>
              <X className="size-3.5" /> Remover
            </Button>
          )}
        </div>
      </div>
      <Field label="Nome" error={errors.name}>
        {(p) => <Input {...p} value={data.name} maxLength={80} onChange={(e) => set({ name: e.target.value })} />}
      </Field>
      <Field label="Cargo ou especialidade" optional error={errors.roleTitle}>
        {(p) => <Input {...p} value={data.roleTitle} maxLength={80} placeholder="Ex.: Especialista em segurança da informação" onChange={(e) => set({ roleTitle: e.target.value })} />}
      </Field>
      <Field label="Bio" optional error={errors.bio} className="sm:col-span-2" counter={{ value: data.bio.length, max: 600 }}>
        {(p) => <Textarea {...p} rows={4} value={data.bio} maxLength={600} onChange={(e) => set({ bio: e.target.value })} />}
      </Field>
      <div className="space-y-2 sm:col-span-2">
        <p className="text-[13px] font-medium text-zinc-900">Links profissionais</p>
        {data.links.map((l, i) => (
          <div key={i} className="flex gap-2">
            <Input aria-label={`Nome do link ${i + 1}`} value={l.label} maxLength={40} placeholder="LinkedIn" className="w-36" onChange={(e) => set({ links: data.links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
            <Input aria-label={`Endereço do link ${i + 1}`} value={l.url} maxLength={300} placeholder="https://" onChange={(e) => set({ links: data.links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) })} aria-invalid={errors[`links.${i}.url`] ? true : undefined} />
            <Button size="sm" variant="ghost" aria-label={`Remover link ${i + 1}`} onClick={() => set({ links: data.links.filter((_, j) => j !== i) })}>
              <X className="size-3.5" />
            </Button>
          </div>
        ))}
        {Object.entries(errors)
          .filter(([k]) => k.startsWith("links"))
          .slice(0, 1)
          .map(([k, v]) => (
            <p key={k} className="text-[13px] text-red-600">
              {v}
            </p>
          ))}
        {data.links.length < 5 && (
          <Button size="sm" variant="secondary" onClick={() => set({ links: [...data.links, { label: "", url: "" }] })}>
            <Plus className="size-3.5" /> Adicionar link
          </Button>
        )}
      </div>
      <MediaPicker
        open={picking}
        onClose={() => setPicking(false)}
        canUpload
        endpoint="/api/cms/blog/media"
        title="Foto do autor"
        onPick={(m) => {
          onPhoto({ id: m.id, url: m.url });
          set({ photoMediaId: m.id });
        }}
      />
    </>
  );
}

function fieldErrors(err: ApiError) {
  return Object.fromEntries(Object.entries(err.fields).map(([k, v]) => [k.replace(/^data\./, ""), v]));
}

export function AuthorsAdmin({ authors, users }: { authors: AuthorDTO[]; users: { id: string; name: string; email: string }[] }) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState<AuthorDTO | "new" | null>(null);
  const [removing, setRemoving] = useState<AuthorDTO | null>(null);
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!removing) return;
    setBusy(true);
    try {
      await api(`/api/cms/blog/authors/${removing.id}`, { method: "DELETE" });
      toast.success("Autor excluído.");
      setRemoving(null);
      router.refresh();
    } catch (e) {
      toast.error((e as ApiError).message);
      setRemoving(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setEditing("new")}>
          <Plus className="size-4" /> Novo autor
        </Button>
      </div>
      {editing && (
        <AuthorForm
          key={editing === "new" ? "new" : editing.id}
          initial={editing === "new" ? null : editing}
          users={users}
          onDone={() => {
            setEditing(null);
            router.refresh();
          }}
          onCancel={() => setEditing(null)}
        />
      )}
      <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white">
        {authors.map((a) => (
          <li key={a.id} className="flex items-center gap-4 px-4 py-3">
            <div className="relative size-10 shrink-0 overflow-hidden rounded-full bg-zinc-100">{a.photoUrl && <Image src={a.photoUrl} alt="" fill sizes="40px" className="object-cover" />}</div>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-zinc-900">
                {a.name}
                <Badge tone={a.affiliation === "guest" ? "blue" : "neutral"}>{a.affiliation === "guest" ? "Convidado" : "Equipe"}</Badge>
                {!a.isActive && <Badge tone="amber">Inativo</Badge>}
              </p>
              <p className="truncate text-[13px] text-zinc-500">
                {[a.roleTitle, a.userEmail ?? "sem conta no Studio", `${a.articles} ${a.articles === 1 ? "artigo" : "artigos"}`].filter(Boolean).join(" · ")}
              </p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setEditing(a)} aria-label={`Editar ${a.name}`}>
              <Pencil className="size-3.5" />
            </Button>
            <Button size="sm" variant="ghost" className="text-red-700 hover:bg-red-50" disabled={a.articles > 0} title={a.articles > 0 ? "Autor com artigos: desative em vez de excluir" : undefined} onClick={() => setRemoving(a)} aria-label={`Excluir ${a.name}`}>
              <Trash2 className="size-3.5" />
            </Button>
          </li>
        ))}
      </ul>
      <ConfirmDialog open={removing !== null} title="Excluir o autor?" description="O perfil some do Blog. Esta ação não pode ser desfeita." confirmLabel="Excluir" loading={busy} onConfirm={remove} onClose={() => setRemoving(null)} />
    </div>
  );
}

function AuthorForm({ initial, users, onDone, onCancel }: { initial: AuthorDTO | null; users: { id: string; name: string; email: string }[]; onDone: () => void; onCancel: () => void }) {
  const toast = useToast();
  const [data, setData] = useState<AuthorInput>(
    initial
      ? { name: initial.name, slug: initial.slug, roleTitle: initial.roleTitle, bio: initial.bio, photoMediaId: initial.photoMediaId, links: initial.links, affiliation: initial.affiliation, userId: initial.userId, isActive: initial.isActive }
      : { name: "", slug: "", roleTitle: "", bio: "", photoMediaId: null, links: [], affiliation: "guest", userId: null, isActive: true },
  );
  const [photo, setPhoto] = useState<PhotoPreview>(initial?.photoMediaId && initial.photoUrl ? { id: initial.photoMediaId, url: initial.photoUrl } : null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<AuthorInput>) =>
    setData((d) => ({ ...d, ...patch, ...(patch.name !== undefined && !initial ? { slug: slugify(patch.name) } : {}) }));

  async function submit() {
    setBusy(true);
    try {
      if (initial) await api(`/api/cms/blog/authors/${initial.id}`, { method: "PUT", body: { version: initial.version, data } });
      else await api("/api/cms/blog/authors", { body: { data } });
      toast.success(initial ? "Autor salvo." : "Autor criado.");
      onDone();
    } catch (e) {
      setErrors(fieldErrors(e as ApiError));
      toast.error((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title={initial ? `Editar ${initial.name}` : "Novo autor"}>
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <ProfileFields data={data} set={set} errors={errors} photo={photo} onPhoto={setPhoto} />
        <Field label="Endereço do perfil" error={errors.slug}>
          {(p) => <Input {...p} value={data.slug} maxLength={90} onChange={(e) => set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} />}
        </Field>
        <Field label="Vínculo" error={errors.affiliation} hint="Convidados aparecem como colunista convidado, nunca como equipe da Rocket.">
          {(p) => (
            <Select {...p} value={data.affiliation} onChange={(e) => set({ affiliation: e.target.value as AuthorInput["affiliation"] })}>
              <option value="guest">Colunista convidado</option>
              <option value="team">Equipe Rocket Vision</option>
            </Select>
          )}
        </Field>
        <Field label="Conta no Studio" optional error={errors.userId} hint="Quem tem a conta pode escrever como este autor.">
          {(p) => (
            <Select {...p} value={data.userId ?? ""} onChange={(e) => set({ userId: e.target.value || null })}>
              <option value="">Sem conta</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </Select>
          )}
        </Field>
        <div className="flex items-end">
          <Switch label="Ativo" description="Autores inativos não recebem artigos novos." checked={data.isActive} onChange={(v) => set({ isActive: v })} />
        </div>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" loading={busy}>
            Salvar
          </Button>
        </div>
      </form>
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */
/* Perfil do próprio autor                                                      */
/* -------------------------------------------------------------------------- */

export function OwnProfileForm({
  initial,
  version,
  photoUrl,
  affiliation,
  slug,
}: {
  initial: OwnAuthorProfile;
  version: number | null;
  photoUrl: string | null;
  affiliation: "team" | "guest" | null;
  slug: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [data, setData] = useState(initial);
  const [photo, setPhoto] = useState<PhotoPreview>(initial.photoMediaId && photoUrl ? { id: initial.photoMediaId, url: photoUrl } : null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [currentVersion, setCurrentVersion] = useState(version);

  async function submit() {
    setBusy(true);
    try {
      const { author } = await api<{ author: { version: number } }>("/api/cms/blog/profile", { method: "PUT", body: { version: currentVersion, data } });
      setCurrentVersion(author.version);
      setErrors({});
      toast.success("Perfil salvo.");
      router.refresh();
    } catch (e) {
      setErrors(fieldErrors(e as ApiError));
      toast.error((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      title="Como você aparece nos artigos"
      description={affiliation === "guest" ? "Seu perfil aparece como Colunista convidado." : affiliation === "team" ? "Seu perfil aparece como parte da equipe." : "O perfil é criado com o seu primeiro artigo ou ao salvar aqui."}
    >
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <ProfileFields data={data} set={(patch) => setData((d) => ({ ...d, ...patch }))} errors={errors} photo={photo} onPhoto={setPhoto} />
        <div className="flex items-center justify-between gap-2 sm:col-span-2">
          <p className="text-[13px] text-zinc-500">{slug ? `Página pública: /blog/autor/${slug} (aparece depois do primeiro artigo publicado).` : ""}</p>
          <Button type="submit" loading={busy}>
            Salvar perfil
          </Button>
        </div>
      </form>
    </Panel>
  );
}
