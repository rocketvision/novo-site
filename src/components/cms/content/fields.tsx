"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/cms/ui/button";
import { Field, Input, Select, Textarea } from "@/components/cms/ui/field";
import type { ImageField as ImageValue } from "@/lib/content/schemas";
import { cn } from "@/lib/utils";
import { ImageField } from "./image-field";
import { errorsUnder, getAt, pathKey, type Path } from "./path";
import type { FieldSpec } from "./specs";

type FormApi = {
  value: unknown;
  set: (path: Path, value: unknown) => void;
  errors: Record<string, string>;
  readOnly: boolean;
};

export function Fields({ specs, path, form }: { specs: FieldSpec[]; path: Path; form: FormApi }) {
  const parent = (getAt(form.value, path) ?? {}) as Record<string, unknown>;
  return (
    <div className="space-y-5">
      {specs.map((spec) => (
        <FieldRenderer key={spec.key} spec={spec} path={[...path, spec.key]} parent={parent} form={form} />
      ))}
    </div>
  );
}

function FieldRenderer({ spec, path, parent, form }: { spec: FieldSpec; path: Path; parent: Record<string, unknown>; form: FormApi }) {
  const value = getAt(form.value, path);
  const error = form.errors[pathKey(path)];

  switch (spec.type) {
    case "text": {
      const text = typeof value === "string" ? value : "";
      const disabledReason = spec.disabledWhen?.(parent) ?? null;
      const Control = spec.multiline ? Textarea : Input;
      return (
        <Field
          label={spec.label}
          optional={spec.optional}
          hint={disabledReason ?? spec.hint}
          error={error}
          counter={disabledReason ? undefined : { value: text.length, max: spec.max }}
        >
          {(p) => (
            <Control
              {...p}
              value={text}
              rows={spec.multiline ? 3 : undefined}
              disabled={Boolean(disabledReason)}
              readOnly={form.readOnly}
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => form.set(path, e.target.value)}
            />
          )}
        </Field>
      );
    }

    case "select":
      return (
        <Field label={spec.label} hint={spec.hint} error={error}>
          {(p) => (
            <Select {...p} value={String(value ?? "")} disabled={form.readOnly} onChange={(e) => form.set(path, e.target.value)}>
              {spec.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
      );

    case "link": {
      const link = (value ?? { label: "", href: "" }) as { label: string; href: string };
      return (
        <fieldset>
          <legend className="mb-1.5 text-[13px] font-medium text-zinc-900">{spec.label}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Texto" error={form.errors[pathKey([...path, "label"])]} counter={{ value: link.label.length, max: 40 }}>
              {(p) => <Input {...p} value={link.label} readOnly={form.readOnly} onChange={(e) => form.set([...path, "label"], e.target.value)} />}
            </Field>
            <Field label="Destino" error={form.errors[pathKey([...path, "href"])]}>
              {(p) => <Input {...p} value={link.href} readOnly={form.readOnly} onChange={(e) => form.set([...path, "href"], e.target.value)} placeholder="#contato, /projetos ou https://..." />}
            </Field>
          </div>
          {spec.hint && <p className="mt-1.5 text-[13px] text-zinc-500">{spec.hint}</p>}
        </fieldset>
      );
    }

    case "image":
      return (
        <ImageField
          label={spec.label}
          hint={spec.hint}
          minWidth={spec.minWidth}
          value={value as ImageValue}
          error={error ?? form.errors[pathKey([...path, "mediaId"])]}
          altError={form.errors[pathKey([...path, "alt"])]}
          onChange={(next) => !form.readOnly && form.set(path, next)}
        />
      );

    case "group":
      return (
        <fieldset className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-5">
          {/* float tira a legenda da borda: ela vira um título comum dentro do grupo. */}
          <legend className="float-left mb-4 w-full">
            <span className="block text-sm font-semibold text-zinc-900">{spec.label}</span>
            {spec.hint && <span className="mt-0.5 block text-[13px] font-normal text-zinc-500">{spec.hint}</span>}
          </legend>
          <div className="clear-left">
            <Fields specs={spec.fields} path={path} form={form} />
          </div>
        </fieldset>
      );

    case "lines":
      return <LinesField spec={spec} path={path} form={form} />;

    case "list":
      return <ListField spec={spec} path={path} form={form} />;
  }
}

function move<T>(list: T[], from: number, to: number) {
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

function LinesField({ spec, path, form }: { spec: Extract<FieldSpec, { type: "lines" }>; path: Path; form: FormApi }) {
  const lines = (getAt(form.value, path) as string[] | undefined) ?? [];
  const listError = form.errors[pathKey(path)];
  const fixed = spec.min === spec.maxItems;

  return (
    <fieldset>
      <legend className="mb-1.5 text-[13px] font-medium text-zinc-900">{spec.label}</legend>
      <ol className="space-y-2">
        {lines.map((line, i) => {
          const itemError = form.errors[pathKey([...path, i])];
          const label = spec.fixedLabels?.[i] ?? `${spec.itemLabel} ${i + 1}`;
          return (
            <li key={i}>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <Field label={label} error={itemError} counter={{ value: line.length, max: spec.max }}>
                    {(p) => <Input {...p} value={line} readOnly={form.readOnly} onChange={(e) => form.set([...path, i], e.target.value)} />}
                  </Field>
                </div>
                {!fixed && !form.readOnly && (
                  <div className="mt-7 flex shrink-0 gap-0.5">
                    <IconButton label={`Mover ${label.toLowerCase()} para cima`} disabled={i === 0} onClick={() => form.set(path, move(lines, i, i - 1))}>
                      <ArrowUp className="size-3.5" />
                    </IconButton>
                    <IconButton label={`Mover ${label.toLowerCase()} para baixo`} disabled={i === lines.length - 1} onClick={() => form.set(path, move(lines, i, i + 1))}>
                      <ArrowDown className="size-3.5" />
                    </IconButton>
                    <IconButton label={`Remover ${label.toLowerCase()}`} disabled={lines.length <= spec.min} onClick={() => form.set(path, lines.filter((_, j) => j !== i))}>
                      <Trash2 className="size-3.5" />
                    </IconButton>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {!fixed && !form.readOnly && lines.length < spec.maxItems && (
        <Button variant="ghost" size="sm" className="mt-2" onClick={() => form.set(path, [...lines, ""])}>
          <Plus className="size-3.5" /> Adicionar {spec.itemLabel.toLowerCase()}
        </Button>
      )}
      {listError && <p className="mt-1.5 text-[13px] text-red-600">{listError}</p>}
      {spec.hint && !listError && <p className="mt-1.5 text-[13px] text-zinc-500">{spec.hint}</p>}
    </fieldset>
  );
}

function ListField({ spec, path, form }: { spec: Extract<FieldSpec, { type: "list" }>; path: Path; form: FormApi }) {
  const items = (getAt(form.value, path) as Record<string, unknown>[] | undefined) ?? [];
  const listError = form.errors[pathKey(path)];
  // Cartões abertos: começa com todos fechados para a página caber na tela; itens com erro abrem sozinhos.
  const [open, setOpen] = useState<Set<number>>(new Set());

  function add() {
    if (!spec.newItem) return;
    form.set(path, [...items, spec.newItem()]);
    setOpen((s) => new Set(s).add(items.length));
  }

  function reorder(from: number, to: number) {
    form.set(path, move(items, from, to));
    setOpen((s) => {
      const next = new Set<number>();
      for (const i of s) next.add(i === from ? to : i === to ? from : i);
      return next;
    });
  }

  return (
    <fieldset>
      <legend className="mb-1.5 text-[13px] font-medium text-zinc-900">{spec.label}</legend>
      {spec.hint && <p className="-mt-0.5 mb-2.5 text-[13px] text-zinc-500">{spec.hint}</p>}
      <ol className="space-y-2">
        {items.map((item, i) => {
          const hasError = errorsUnder(form.errors, [...path, i]).length > 0;
          const isOpen = open.has(i) || hasError;
          const title = spec.itemTitle?.(item)?.trim();
          const panelId = `${pathKey(path)}-${i}`;
          return (
            <li key={i} className={cn("rounded-lg border bg-white", hasError ? "border-red-300" : "border-zinc-200")}>
              <div className="flex items-center gap-2 px-3 py-2">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpen((s) => (s.has(i) ? new Set([...s].filter((x) => x !== i)) : new Set(s).add(i)))}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <ChevronDown aria-hidden="true" className={cn("size-4 shrink-0 text-zinc-400 transition-transform", isOpen && "rotate-180")} />
                  <span className="shrink-0 text-xs font-medium text-zinc-500 tabular-nums">
                    {spec.itemLabel} {i + 1}
                  </span>
                  <span className="truncate text-[13px] text-zinc-900">{title || <span className="text-zinc-400">Sem título</span>}</span>
                  {hasError && <span className="ml-auto shrink-0 text-xs text-red-600">Revisar</span>}
                </button>
                {!form.readOnly && (
                  <div className="flex shrink-0 gap-0.5">
                    <IconButton label={`Mover ${spec.itemLabel.toLowerCase()} ${i + 1} para cima`} disabled={i === 0} onClick={() => reorder(i, i - 1)}>
                      <ArrowUp className="size-3.5" />
                    </IconButton>
                    <IconButton label={`Mover ${spec.itemLabel.toLowerCase()} ${i + 1} para baixo`} disabled={i === items.length - 1} onClick={() => reorder(i, i + 1)}>
                      <ArrowDown className="size-3.5" />
                    </IconButton>
                    {!spec.fixed && (
                      <IconButton
                        label={`Remover ${spec.itemLabel.toLowerCase()} ${i + 1}`}
                        disabled={items.length <= spec.min}
                        onClick={() => {
                          form.set(path, items.filter((_, j) => j !== i));
                          setOpen(new Set());
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </IconButton>
                    )}
                  </div>
                )}
              </div>
              {isOpen && (
                <div id={panelId} className="border-t border-zinc-100 px-4 py-4">
                  <Fields specs={spec.fields} path={[...path, i]} form={form} />
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {!spec.fixed && !form.readOnly && spec.newItem && items.length < spec.maxItems && (
        <Button variant="secondary" size="sm" className="mt-2.5" onClick={add}>
          <Plus className="size-3.5" /> Adicionar {spec.itemLabel.toLowerCase()}
        </Button>
      )}
      {listError && <p className="mt-1.5 text-[13px] text-red-600">{listError}</p>}
    </fieldset>
  );
}

function IconButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  );
}
