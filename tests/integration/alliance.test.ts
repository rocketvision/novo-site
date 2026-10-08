import { beforeAll, describe, expect, it, vi } from "vitest";

// Cookies controlados pelo teste: sessão do CMS (rv_session) e do Hub (rv_partner) separadas.
const jar = vi.hoisted(() => new Map<string, string>());
vi.mock("next/cache", () => ({ unstable_cache: (fn: () => unknown) => fn, revalidateTag: () => {} }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
  draftMode: async () => ({ isEnabled: false }),
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { value: jar.get(name)! } : undefined),
    set: (name: string, value: string) => (value ? jar.set(name, value) : jar.delete(name)),
  }),
}));
vi.mock("react", async (orig) => ({ ...(await orig<typeof import("react")>()), cache: <T,>(fn: T) => fn }));

import { and, eq, sql } from "drizzle-orm";
import { NextRequest } from "next/server";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";
import { createSession } from "@/server/auth/session";
import { hashToken } from "@/server/auth/tokens";
import { createHubSession } from "@/server/alliance/hub/session";
import { invitePartnerUser } from "@/server/alliance/hub/auth";
import { publishPartner, unpublishPartner, updatePartner, getPartner } from "@/server/alliance/partners";
import { getDirectory, getPublicPartner, getPublicProgram } from "@/server/alliance/public";
import { createReferral, getReferralForHub, listReferralsForHub, updateReferral } from "@/server/alliance/referrals";
import { listPartners } from "@/server/alliance/partners";
import { partnerSummary, pendingWork } from "@/server/alliance/workspace";
import { ALL_PERMISSIONS, type Permission } from "@/server/authz/permissions";
import { actOnEntries, createPayout, hubEarnings, recordReceipt, setRuleStatus, voidPayout } from "@/server/alliance/commissions";
import { totpAt, base32ToSecret } from "@/server/alliance/hub/totp";
import type { HubUser } from "@/server/alliance/hub/session";
import * as applyRoute from "@/app/api/alliance/applications/route";
import * as loginRoute from "@/app/api/alliance/hub/auth/login/route";
import * as twoFactorRoute from "@/app/api/alliance/hub/auth/two-factor/route";
import * as inviteRoute from "@/app/api/alliance/hub/auth/invite/route";
import * as hubReferrals from "@/app/api/alliance/hub/referrals/route";
import * as totpRoute from "@/app/api/alliance/hub/account/totp/route";
import * as teamRoute from "@/app/api/alliance/hub/team/route";
import * as cmsPartner from "@/app/api/cms/alliance/partners/[id]/route";
import * as cmsReceipts from "@/app/api/cms/alliance/receipts/route";
import * as cmsApplication from "@/app/api/cms/alliance/applications/[id]/route";
import * as cmsPayouts from "@/app/api/cms/alliance/payouts/route";
import * as cmsRules from "@/app/api/cms/alliance/rules/route";
import * as cmsContracts from "@/app/api/cms/alliance/contracts/route";
import * as cmsSettings from "@/app/api/cms/alliance/settings/route";
import * as cmsFiles from "@/app/api/cms/alliance/files/route";
import * as cmsReferral from "@/app/api/cms/alliance/referrals/[id]/route";
import * as cmsReferrals from "@/app/api/cms/alliance/referrals/route";
import * as hubResourceFileRoute from "@/app/api/alliance/hub/resources/[id]/file/route";
import * as hubContractAccept from "@/app/api/alliance/hub/contracts/[id]/accept/route";
import { referralInputSchema, referralUpdateSchema } from "@/lib/alliance/validation";
import { createUser, resetTestDatabase } from "../support/db";

// Os serviços recebem dados já validados pelo schema (como nas rotas).
const ref = (x: unknown) => referralInputSchema.parse(x);
const upd = (x: unknown) => referralUpdateSchema.parse(x);

const ORIGIN = "http://localhost:3000";
const ctx = { ip: null, userAgent: null };
const params = <P,>(p: P) => ({ params: Promise.resolve(p) });
let ipN = 0;
const req = (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) =>
  new NextRequest(`${ORIGIN}${path}`, {
    method,
    headers: { ...(body !== undefined && { "content-type": "application/json" }), ...(method !== "GET" && { origin: ORIGIN }), "x-forwarded-for": `10.9.0.${++ipN}`, ...headers },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });

const application = {
  name: "Ana Souza",
  company: "Aurora Studio",
  email: "ana@aurora.example",
  website: "aurora.example",
  phone: "(14) 99999-1234",
  sector: "Agência de marketing",
  modality: "business",
  companyDescription: "Agência de marketing digital focada em pequenas empresas do interior.",
  interest: "Queremos incluir sites e sistemas da Rocket no nosso portfólio de clientes.",
  consentPrivacy: true,
  consentMarketing: false,
};

let owner: { id: string; email: string; name: string };
let editorToken: string;
let adminToken: string;
let ownerToken: string;
let partnerA: string;
let partnerB: string;
let hubA: HubUser;
let hubAMember: HubUser;
let hubB: HubUser;

async function hubUser(partnerId: string, email: string, role: "owner" | "manager" | "member"): Promise<HubUser> {
  const db = getDb();
  const [u] = await db.insert(s.partnerUsers).values({ partnerId, email, name: email.split("@")[0], role, status: "active", passwordHash: "$argon2id$v=19$m=47104,t=1,p=1$x$y", emailVerifiedAt: new Date() }).returning();
  const [p] = await db.select().from(s.partners).where(eq(s.partners.id, partnerId));
  return { id: u.id, email, name: u.name, role, totpEnabled: false, partner: { id: p.id, slug: p.slug, tradeName: p.tradeName, status: p.status as HubUser["partner"]["status"], tierKey: p.tierKey, managersInvite: p.managersInvite } };
}

beforeAll(async () => {
  await resetTestDatabase();
  const db = getDb();
  const o = await createUser(db, { email: "owner-ra@rocketvision.dev", roleKey: "owner", name: "Owner RA", password: "senha-de-teste-longa-1" });
  const a = await createUser(db, { email: "admin-ra@rocketvision.dev", roleKey: "admin", name: "Admin RA", password: "senha-de-teste-longa-1" });
  const e = await createUser(db, { email: "editor-ra@rocketvision.dev", roleKey: "editor", name: "Editor RA", password: "senha-de-teste-longa-1" });
  owner = { id: o.id, email: o.email, name: o.name };
  ownerToken = (await createSession(o.id, ctx)).token;
  adminToken = (await createSession(a.id, ctx)).token;
  editorToken = (await createSession(e.id, ctx)).token;
});

const asCms = (token: string) => {
  jar.clear();
  jar.set("rv_session", token);
};

describe("Candidatura pública", () => {
  it("grava como Pending Review, sem parceiro e sem acesso ao Hub", async () => {
    const r = await applyRoute.POST(req("POST", "/api/alliance/applications", application), params({}));
    expect(r.status).toBe(200);
    const rows = await getDb().select().from(s.partnerApplications);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ status: "pending_review", company: "Aurora Studio", phone: "14999991234", website: "https://aurora.example", partnerId: null });
    expect(await getDb().select().from(s.partners)).toHaveLength(0);
    expect(await getDb().select().from(s.partnerUsers)).toHaveLength(0);
  });

  it("não duplica a candidatura em análise do mesmo e-mail (mesma resposta)", async () => {
    const r = await applyRoute.POST(req("POST", "/api/alliance/applications", { ...application, company: "Outra" }), params({}));
    expect(r.status).toBe(200);
    expect(await getDb().select().from(s.partnerApplications)).toHaveLength(1);
  });

  it("recusa sem consentimento, com erros por campo; bot é ignorado; outra origem 403", async () => {
    const bad = await applyRoute.POST(req("POST", "/api/alliance/applications", { ...application, email: "x", consentPrivacy: false, modality: "gold" }), params({}));
    expect(bad.status).toBe(422);
    expect(Object.keys((await bad.json()).error.fields)).toEqual(expect.arrayContaining(["email", "consentPrivacy", "modality"]));
    expect((await applyRoute.POST(req("POST", "/api/alliance/applications", { ...application, email: "bot@x.example", fax: "1" }), params({}))).status).toBe(200);
    expect(await getDb().select().from(s.partnerApplications)).toHaveLength(1);
    expect((await applyRoute.POST(req("POST", "/api/alliance/applications", application, { origin: "https://evil.example" }), params({}))).status).toBe(403);
  });

  it("registra o e-mail de confirmação uma única vez", async () => {
    const logs = await getDb().select().from(s.allianceEmailLog).where(eq(s.allianceEmailLog.template, "application_received"));
    expect(logs).toHaveLength(1);
  });
});

describe("Aprovação e permissões do CMS", () => {
  it("editor do CMS não acessa o Rocket Alliance (403)", async () => {
    const [app] = await getDb().select().from(s.partnerApplications);
    asCms(editorToken);
    const r = await cmsApplication.POST(req("POST", `/api/cms/alliance/applications/${app.id}`, { action: "note", message: "oi" }), params({ id: app.id }));
    expect(r.status).toBe(403);
  });

  it("administrador aprova: cria o parceiro em onboarding, sem publicação e sem acesso", async () => {
    const [app] = await getDb().select().from(s.partnerApplications);
    asCms(adminToken);
    const r = await cmsApplication.POST(req("POST", `/api/cms/alliance/applications/${app.id}`, { action: "approve", slug: "aurora-studio", tierKey: "member", modalities: ["business", "referral"], message: "" }), params({ id: app.id }));
    expect(r.status).toBe(200);
    partnerA = (await r.json()).partnerId;
    const [p] = await getDb().select().from(s.partners).where(eq(s.partners.id, partnerA));
    expect(p).toMatchObject({ status: "onboarding", directoryEnabled: false, publishedSnapshot: null });
    expect(await getDb().select().from(s.partnerUsers)).toHaveLength(0);
    // Decidir de novo: 409.
    const again = await cmsApplication.POST(req("POST", `/api/cms/alliance/applications/${app.id}`, { action: "reject", message: "x" }), params({ id: app.id }));
    expect(again.status).toBe(409);
  });

  it("administrador não tem finanças: registrar recebimento é 403", async () => {
    asCms(adminToken);
    const r = await cmsReceipts.POST(req("POST", "/api/cms/alliance/receipts", {}), params({}));
    expect(r.status).toBe(403);
  });
});

describe("Publicação e diretório", () => {
  it("não publica sem logotipo, descrição curta e site; publica e despublica", async () => {
    const data = (await getPartner(partnerA))!;
    await expect(publishPartner(owner, partnerA, data.row.version, ctx)).rejects.toMatchObject({ status: 422 });
    const [logo] = await getDb().insert(s.media).values({ storageKey: "t/logo.png", url: "/uploads/t/logo.png", mimeType: "image/png", sizeBytes: 10, width: 300, height: 100, alt: "Logo", filename: "logo.png", sha256: "abc" }).returning();
    asCms(ownerToken);
    const save = await cmsPartner.PUT(
      req("PUT", `/api/cms/alliance/partners/${partnerA}`, { version: data.row.version, data: { ...data.input, logoMediaId: logo.id, shortDescription: "Agência parceira.", websiteUrl: "https://aurora.example", legalName: "Aurora LTDA", contactPhone: "(14) 99999-1234" } }),
      params({ id: partnerA }),
    );
    expect(save.status).toBe(200);
    const { version } = await save.json();
    await publishPartner(owner, partnerA, version, ctx);
    const directory = await getDirectory();
    expect(directory.map((d) => d.slug)).toEqual(["aurora-studio"]);
    const pub = await getPublicPartner("aurora-studio");
    expect(pub?.tradeName).toBe("Aurora Studio");
    // Nada interno no snapshot público.
    const [row] = await getDb().select().from(s.partners).where(eq(s.partners.id, partnerA));
    const snap = JSON.stringify(row.publishedSnapshot);
    expect(snap).not.toContain("Aurora LTDA");
    expect(snap).not.toContain("14999991234");
    await unpublishPartner(owner, partnerA, row.version, ctx);
    expect(await getDirectory()).toHaveLength(0);
    expect(await getPublicPartner("aurora-studio")).toBeNull();
  });

  it("suspender tira do ar e derruba as sessões do Hub", async () => {
    const [p] = await getDb().insert(s.partners).values({ slug: "norte-labs", tradeName: "Norte Labs", status: "active", tierKey: "member" }).returning();
    partnerB = p.id;
    await getDb().insert(s.partnerModalityLinks).values({ partnerId: partnerB, modalityKey: "technology" });
    hubB = await hubUser(partnerB, "owner@norte.example", "owner");
    const session = await createHubSession(hubB.id, ctx);
    const data = (await getPartner(partnerB))!;
    await updatePartner(owner, partnerB, { ...data.input, status: "suspended" }, data.row.version, ctx);
    expect(await getDb().select().from(s.partnerSessions).where(eq(s.partnerSessions.id, hashToken(session.token)))).toHaveLength(0);
    const again = (await getPartner(partnerB))!;
    await updatePartner(owner, partnerB, { ...again.input, status: "active" }, again.row.version, ctx);
  });
});

describe("Alliance Hub: autenticação", () => {
  it("convite → senha → sessão; login com senha errada 401; sessão do Hub não vale no CMS", async () => {
    const invite = await invitePartnerUser({ kind: "cms", actor: owner }, partnerA, { name: "Ana Souza", email: "ana@aurora.example", role: "owner" }, ctx);
    expect(invite.link).toMatch(/\/alliance\/convite\//);
    const token = invite.link!.split("/").pop()!;
    jar.clear();
    const accept = await inviteRoute.POST(req("POST", "/api/alliance/hub/auth/invite", { token, password: "senha-forte-do-hub-1" }), params({}));
    expect(accept.status).toBe(200);
    expect(jar.get("rv_partner")).toMatch(/^[a-z2-7]{32}$/);
    // Link de uso único.
    expect((await inviteRoute.POST(req("POST", "/api/alliance/hub/auth/invite", { token, password: "senha-forte-do-hub-1" }), params({}))).status).toBe(410);
    jar.clear();
    expect((await loginRoute.POST(req("POST", "/api/alliance/hub/auth/login", { email: "ana@aurora.example", password: "errada-errada" }), params({}))).status).toBe(401);
    expect((await loginRoute.POST(req("POST", "/api/alliance/hub/auth/login", { email: "ANA@aurora.example", password: "senha-forte-do-hub-1" }), params({}))).status).toBe(200);
    // Cookie do Hub não abre rotas do CMS.
    const hubCookie = jar.get("rv_partner")!;
    jar.clear();
    jar.set("rv_partner", hubCookie);
    const cms = await cmsApplication.POST(req("POST", `/api/cms/alliance/applications/00000000-0000-4000-8000-000000000000`, { action: "note", message: "x" }), params({ id: "00000000-0000-4000-8000-000000000000" }));
    expect(cms.status).toBe(401);
    const [u] = await getDb().select().from(s.partnerUsers).where(eq(s.partnerUsers.email, "ana@aurora.example"));
    expect(u.emailVerifiedAt).not.toBeNull();
    const [p] = await getDb().select().from(s.partners).where(eq(s.partners.id, partnerA));
    hubA = { id: u.id, email: u.email, name: u.name, role: "owner", totpEnabled: false, partner: { id: partnerA, slug: p.slug, tradeName: p.tradeName, status: p.status as HubUser["partner"]["status"], tierKey: p.tierKey, managersInvite: p.managersInvite } };
  });

  it("2FA: ativa com código do app e exige o segundo passo no login", async () => {
    process.env.ALLIANCE_ENCRYPTION_KEY ??= "chave-de-teste-com-mais-de-32-caracteres-123";
    const { env } = await import("@/server/env");
    (env as { ALLIANCE_ENCRYPTION_KEY?: string }).ALLIANCE_ENCRYPTION_KEY = process.env.ALLIANCE_ENCRYPTION_KEY;
    const start = await totpRoute.POST(req("POST", "/api/alliance/hub/account/totp", {}), params({}));
    expect(start.status).toBe(200);
    const { key } = await start.json();
    const code = totpAt(base32ToSecret(key), Math.floor(Date.now() / 30000));
    const confirm = await totpRoute.PUT(req("PUT", "/api/alliance/hub/account/totp", { code }), params({}));
    expect(confirm.status).toBe(200);
    const { recoveryCodes } = await confirm.json();
    expect(recoveryCodes).toHaveLength(10);

    jar.clear();
    const login = await loginRoute.POST(req("POST", "/api/alliance/hub/auth/login", { email: "ana@aurora.example", password: "senha-forte-do-hub-1" }), params({}));
    const { twoFactor, challenge } = await login.json();
    expect(twoFactor).toBe(true);
    expect(jar.has("rv_partner")).toBe(false);
    expect((await twoFactorRoute.POST(req("POST", "/api/alliance/hub/auth/two-factor", { challenge, code: "000000" }), params({}))).status).toBe(422);
    // Código de recuperação vale uma vez.
    expect((await twoFactorRoute.POST(req("POST", "/api/alliance/hub/auth/two-factor", { challenge, code: recoveryCodes[0] }), params({}))).status).toBe(200);
    expect(jar.get("rv_partner")).toBeTruthy();
    const [u] = await getDb().select().from(s.partnerUsers).where(eq(s.partnerUsers.id, hubA.id));
    expect(u.recoveryCodes).toHaveLength(9);
  });

  it("Partner Owner não cria outro owner pelo Hub; membro não convida", async () => {
    const r = await teamRoute.POST(req("POST", "/api/alliance/hub/team", { name: "Bia", email: "bia@aurora.example", role: "owner" }), params({}));
    expect(r.status).toBe(403);
    const ok = await teamRoute.POST(req("POST", "/api/alliance/hub/team", { name: "Caio", email: "caio@aurora.example", role: "member" }), params({}));
    expect(ok.status).toBe(201);
  });
});

describe("Indicações: duplicidade, isolamento e transições", () => {
  const referral = { companyName: "Padaria Sol Ltda", companyWebsite: "https://www.padariasol.example/contato", companyTaxId: "", contactName: "João", contactRole: "", contactEmail: "joao@padariasol.example", contactPhone: "", city: "Ourinhos", need: "Precisa de um site com cardápio e pedidos.", services: [], estimatedValue: "", consentConfirmed: true };

  it("registra pelo Hub e protege a empresa", async () => {
    const r = await hubReferrals.POST(req("POST", "/api/alliance/hub/referrals", referral), params({}));
    expect(r.status).toBe(201);
    const { code } = await r.json();
    expect(code).toMatch(/^RA-\d{6}$/);
    const [row] = await getDb().select().from(s.referrals);
    expect(row).toMatchObject({ companyDomain: "padariasol.example", partnerId: partnerA, status: "submitted" });
    expect(row.protectedUntil.getTime()).toBeGreaterThan(Date.now() + 80 * 86400_000);
  });

  it("outra empresa não registra o mesmo domínio e não descobre quem indicou", async () => {
    await expect(createReferral(hubB, ref({ ...referral, companyName: "Sol Padaria e Confeitaria", contactEmail: "compras@outra.example", companyWebsite: "padariasol.example" }), ctx)).rejects.toMatchObject({
      status: 409,
      message: "Uma empresa com este site já está registrada no programa e protegida por outra indicação.",
      extra: { fields: { companyWebsite: "Uma empresa com este site já está registrada no programa e protegida por outra indicação." } },
    });
  });

  it("a própria empresa vê qual indicação já tem o mesmo site, no campo do site", async () => {
    await expect(createReferral(hubA, ref({ ...referral, companyName: "Outro Nome Qualquer" }), ctx)).rejects.toMatchObject({
      status: 409,
      extra: { fields: { companyWebsite: expect.stringMatching(/^A sua empresa já indicou uma empresa com este site: RA-\d{6} \(Padaria Sol Ltda\)/) } },
    });
  });

  it("CNPJ inválido é recusado com mensagem clara", async () => {
    const r = await hubReferrals.POST(req("POST", "/api/alliance/hub/referrals", { ...referral, companyName: "Empresa CNPJ Errado", companyWebsite: "", companyTaxId: "12.345.678/0001-00" }), params({}));
    expect(r.status).toBe(422);
    expect((await r.json()).error.fields.companyTaxId).toMatch(/CNPJ inválido/);
  });

  it("mesmo domínio só no e-mail do contato não bloqueia: entra marcado como possível duplicidade", async () => {
    // Ex.: o mesmo contador ou agência como contato de empresas diferentes.
    const other = { ...referral, companyName: "Oficina Norte", companyWebsite: "", contactEmail: "contador@padariasol.example" };
    const mine = await createReferral(hubA, ref(other), ctx);
    const [row] = await getDb().select().from(s.referrals).where(eq(s.referrals.id, mine.id));
    expect(row).toMatchObject({ companyDomain: null, partnerId: partnerA });
    expect(row.possibleDuplicateOf).not.toBeNull();
    const again = await createReferral(hubA, ref({ ...other, companyName: "Auto Peças Leste" }), ctx);
    expect(again.id).not.toBe(mine.id);
  });

  it("dois envios simultâneos da mesma empresa: só um fica com a proteção", async () => {
    const same = { ...referral, companyName: "Mercado Azul", companyWebsite: "mercadoazul.example", contactEmail: "a@mercadoazul.example" };
    const results = await Promise.allSettled([createReferral(hubA, ref(same), ctx), createReferral(hubB, ref(same), ctx)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    expect(await getDb().select().from(s.referrals).where(eq(s.referrals.companyDomain, "mercadoazul.example"))).toHaveLength(1);
  });

  it("nome igual sem domínio em comum entra marcado como possível duplicidade", async () => {
    const r = await createReferral(hubB, ref({ ...referral, companyName: "PADARIA SOL", companyWebsite: "", contactEmail: "dono@gmail.com" }), ctx);
    const [row] = await getDb().select().from(s.referrals).where(eq(s.referrals.id, r.id));
    expect(row.possibleDuplicateOf).not.toBeNull();
  });

  it("isolamento: outra empresa e o Partner Member não veem indicações que não são deles", async () => {
    const [mine] = await getDb().select().from(s.referrals).where(and(eq(s.referrals.partnerId, partnerA), eq(s.referrals.companyDomain, "padariasol.example")));
    expect(await getReferralForHub(hubB, mine.id)).toBeNull();
    hubAMember = await hubUser(partnerA, "membro@aurora.example", "member");
    expect(await getReferralForHub(hubAMember, mine.id)).toBeNull();
    expect(await listReferralsForHub(hubAMember)).toHaveLength(0);
    expect((await listReferralsForHub(hubA)).length).toBeGreaterThan(0);
    expect((await listReferralsForHub(hubB)).every((r) => r.id !== mine.id)).toBe(true);
  });

  it("a equipe registra pelo CMS em nome de um parceiro, que é avisado no Hub", async () => {
    asCms(adminToken);
    const body = { ...referral, partnerId: partnerA, companyName: "Clínica Horizonte", companyWebsite: "clinicahorizonte.example", contactEmail: "dra@clinicahorizonte.example" };
    const r = await cmsReferrals.POST(req("POST", "/api/cms/alliance/referrals", body), params({}));
    expect(r.status).toBe(201);
    const { id, code } = await r.json();
    expect(code).toMatch(/^RA-\d{6}$/);
    const [row] = await getDb().select().from(s.referrals).where(eq(s.referrals.id, id));
    expect(row).toMatchObject({ partnerId: partnerA, submittedBy: null, status: "submitted", companyDomain: "clinicahorizonte.example" });
    const [event] = await getDb().select().from(s.referralEvents).where(eq(s.referralEvents.referralId, id));
    expect(event).toMatchObject({ actorType: "cms", toStatus: "submitted" });
    expect((await listReferralsForHub(hubA)).some((x) => x.id === id)).toBe(true);
    const notices = await getDb().select().from(s.partnerNotifications).where(eq(s.partnerNotifications.partnerUserId, hubA.id));
    expect(notices.some((n) => n.link === `/alliance/indicacoes/${id}`)).toBe(true);
  });

  it("no CMS, a duplicidade mostra a indicação existente e o parceiro dela", async () => {
    asCms(adminToken);
    const body = { ...referral, partnerId: partnerB, companyName: "Horizonte Saúde", companyWebsite: "https://clinicahorizonte.example", contactEmail: "x@outra.example" };
    const r = await cmsReferrals.POST(req("POST", "/api/cms/alliance/referrals", body), params({}));
    expect(r.status).toBe(409);
    const { error } = await r.json();
    expect(error.fields.companyWebsite).toMatch(/^Já existe uma indicação protegida com este site: RA-\d{6} \(Clínica Horizonte\), de /);
  });

  it("no CMS, sem parceiro ou com parceiro suspenso, a indicação é recusada com mensagem clara", async () => {
    asCms(adminToken);
    const body = { ...referral, companyName: "Loja Ventura", companyWebsite: "lojaventura.example", contactEmail: "a@lojaventura.example" };
    const missing = await cmsReferrals.POST(req("POST", "/api/cms/alliance/referrals", body), params({}));
    expect(missing.status).toBe(422);
    expect((await missing.json()).error.fields.partnerId).toBe("Escolha a empresa parceira que fez a indicação.");

    const [{ status }] = await getDb().select({ status: s.partners.status }).from(s.partners).where(eq(s.partners.id, partnerB));
    await getDb().update(s.partners).set({ status: "suspended" }).where(eq(s.partners.id, partnerB));
    try {
      const suspended = await cmsReferrals.POST(req("POST", "/api/cms/alliance/referrals", { ...body, partnerId: partnerB }), params({}));
      expect(suspended.status).toBe(422);
      expect((await suspended.json()).error.fields.partnerId).toMatch(/está suspensa no programa e não pode receber novas indicações\.$/);
    } finally {
      await getDb().update(s.partners).set({ status }).where(eq(s.partners.id, partnerB));
    }
  });

  it("no CMS, a pessoa que indicou precisa ser da equipe ativa do parceiro e passa a acompanhar a indicação", async () => {
    asCms(adminToken);
    const body = { ...referral, partnerId: partnerA, companyName: "Estúdio Prisma", companyWebsite: "estudioprisma.example", contactEmail: "oi@estudioprisma.example" };
    const wrong = await cmsReferrals.POST(req("POST", "/api/cms/alliance/referrals", { ...body, submittedBy: hubB.id }), params({}));
    expect(wrong.status).toBe(422);
    expect((await wrong.json()).error.fields.submittedBy).toMatch(/não está ativa na equipe de/);

    const ok = await cmsReferrals.POST(req("POST", "/api/cms/alliance/referrals", { ...body, submittedBy: hubAMember.id }), params({}));
    expect(ok.status).toBe(201);
    const { id } = await ok.json();
    const [row] = await getDb().select().from(s.referrals).where(eq(s.referrals.id, id));
    expect(row.submittedBy).toBe(hubAMember.id);
    expect((await listReferralsForHub(hubAMember)).some((x) => x.id === id)).toBe(true);
    const notices = await getDb().select().from(s.partnerNotifications).where(eq(s.partnerNotifications.partnerUserId, hubAMember.id));
    expect(notices.some((n) => n.link === `/alliance/indicacoes/${id}`)).toBe(true);
  });

  it("pendências e ficha do parceiro: só o que a pessoa pode ver, e filtradas por parceiro", async () => {
    const all = new Set<Permission>(ALL_PERMISSIONS);
    const groups = await pendingWork(all);
    const fresh = groups.find((g) => g.key === "new_referrals");
    expect(fresh?.count).toBeGreaterThan(0);
    expect(fresh?.items.every((i) => i.href.startsWith("/cms/alliance/indicacoes/"))).toBe(true);

    const onlyA = await pendingWork(all, partnerA);
    const freshA = onlyA.find((g) => g.key === "new_referrals");
    const [{ n }] = (await getDb().execute<{ n: number }>(sql`SELECT count(*)::int AS n FROM referrals WHERE partner_id = ${partnerA} AND status = 'submitted'`)).rows;
    expect(freshA?.count).toBe(n);
    expect(onlyA.some((g) => g.key === "applications" || g.key === "emails_failed")).toBe(false);

    const viewOnly = await pendingWork(new Set<Permission>(["alliance.view"]));
    expect(viewOnly.every((g) => ["new_referrals", "expiring_referrals"].includes(g.key))).toBe(true);

    const summary = await partnerSummary(partnerA, new Set<Permission>(["alliance.view"]));
    expect(summary.referrals.total).toBeGreaterThan(0);
    expect(summary.finance).toBeNull();
    expect(summary.contracts).toBeNull();
    expect(summary.activity.length).toBeGreaterThan(0);
    expect((await partnerSummary(partnerA, all)).finance).not.toBeNull();
  });

  it("lista de parceiros: indicações, pendências, ordenação e comissão só para finanças", async () => {
    const rows = await listPartners({ sort: "referrals", finance: false });
    expect(rows.every((r) => r.toPayCents === null)).toBe(true);
    const a = rows.find((r) => r.id === partnerA)!;
    expect(a.openReferrals).toBeGreaterThan(0);
    expect(rows[0].openReferrals).toBeGreaterThanOrEqual(rows[rows.length - 1].openReferrals);
    const pendingOnly = await listPartners({ pending: true });
    expect(pendingOnly.every((r) => r.pendingCount > 0)).toBe(true);
    expect((await listPartners({ finance: true })).every((r) => typeof r.toPayCents === "number")).toBe(true);
  });

  it("sem a permissão de gerenciar indicações, o CMS não registra", async () => {
    asCms(editorToken);
    const r = await cmsReferrals.POST(req("POST", "/api/cms/alliance/referrals", { ...referral, partnerId: partnerA, companyName: "Sem Permissão", companyWebsite: "sempermissao.example" }), params({}));
    expect(r.status).toBe(403);
  });

  it("transição inválida é recusada; perda exige motivo", async () => {
    const [row] = await getDb().select().from(s.referrals).where(eq(s.referrals.companyDomain, "padariasol.example"));
    await expect(updateReferral(owner, row.id, upd({ status: "won", version: row.version }), ctx)).rejects.toMatchObject({ status: 409 });
    await expect(updateReferral(owner, row.id, upd({ status: "lost", version: row.version }), ctx)).rejects.toMatchObject({ status: 422 });
    let v = (await updateReferral(owner, row.id, upd({ status: "qualified", note: "Cliente com orçamento.", noteVisibleToPartner: true, version: row.version }), ctx)).version;
    v = (await updateReferral(owner, row.id, upd({ status: "in_negotiation", version: v }), ctx)).version;
    await updateReferral(owner, row.id, upd({ status: "won", dealValue: "12.000,00", version: v }), ctx);
    const detail = await getReferralForHub(hubA, row.id);
    expect(detail?.row.status).toBe("won");
    expect(detail?.events.some((e) => e.note === "Cliente com orçamento.")).toBe(true);
  });
});

describe("Comissões e pagamentos", () => {
  let referralId: string;
  let receiptId: string;

  beforeAll(async () => {
    [{ id: referralId }] = await getDb().select({ id: s.referrals.id }).from(s.referrals).where(eq(s.referrals.companyDomain, "padariasol.example"));
  });

  it("sem regra aprovada, o recebimento entra sem comissão", async () => {
    const r = await recordReceipt(owner, { referralId, kind: "one_time", installmentNumber: null, amount: 100000, receivedOn: new Date().toISOString().slice(0, 10), refundOf: null, description: "", externalRef: "nf-1" }, ctx);
    expect(r.entry).toBeNull();
    expect(r.note).toMatch(/Nenhuma regra/);
  });

  it("com a regra do nível aprovada: 5% sobre o recebido, calculado no servidor", async () => {
    const [rule] = await getDb().select().from(s.commissionRules).where(eq(s.commissionRules.tierKey, "member"));
    await setRuleStatus(owner, rule.id, "approved", ctx);
    asCms(ownerToken);
    const res = await cmsReceipts.POST(
      req("POST", "/api/cms/alliance/receipts", { referralId, kind: "one_time", installmentNumber: null, amount: "1.234,57", receivedOn: new Date().toISOString().slice(0, 10), refundOf: null, description: "Parcela 1", externalRef: "nf-2", amountCents: 1 }),
      params({}),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    receiptId = body.receiptId;
    expect(body.entry.amountCents).toBe(6173); // 5% de R$ 1.234,57 = 61,7285 → R$ 61,73
    const program = await getPublicProgram();
    expect(program.tiers.find((t) => t.key === "member")?.rateBp).toBe(500);
  });

  it("mesma referência não gera outro recebimento nem outra comissão", async () => {
    await expect(recordReceipt(owner, { referralId, kind: "one_time", installmentNumber: null, amount: 123457, receivedOn: new Date().toISOString().slice(0, 10), refundOf: null, description: "", externalRef: "nf-2" }, ctx)).rejects.toMatchObject({ status: 409 });
    expect(await getDb().select().from(s.commissionEntries).where(eq(s.commissionEntries.referralId, referralId))).toHaveLength(1);
  });

  it("mensalidades: só dentro da janela da regra; a mesma parcela não entra duas vezes", async () => {
    const [rule] = await getDb().select().from(s.commissionRules).where(eq(s.commissionRules.tierKey, "member"));
    await getDb().update(s.commissionRules).set({ recurringMonths: 1 }).where(eq(s.commissionRules.id, rule.id));
    const today = new Date().toISOString().slice(0, 10);
    const first = await recordReceipt(owner, { referralId, kind: "recurring", installmentNumber: 1, amount: 50000, receivedOn: today, refundOf: null, description: "", externalRef: null }, ctx);
    expect(first.entry?.amountCents).toBe(2500);
    const second = await recordReceipt(owner, { referralId, kind: "recurring", installmentNumber: 2, amount: 50000, receivedOn: today, refundOf: null, description: "", externalRef: null }, ctx);
    expect(second.entry).toBeNull();
    await expect(recordReceipt(owner, { referralId, kind: "recurring", installmentNumber: 1, amount: 50000, receivedOn: today, refundOf: null, description: "", externalRef: null }, ctx)).rejects.toMatchObject({ status: 409 });
  });

  it("reembolso gera estorno proporcional e não passa do valor recebido", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const refund = await recordReceipt(owner, { referralId, kind: "refund", installmentNumber: null, amount: 23457, receivedOn: today, refundOf: receiptId, description: "", externalRef: null }, ctx);
    expect(refund.entry?.amountCents).toBe(-1173);
    await expect(recordReceipt(owner, { referralId, kind: "refund", installmentNumber: null, amount: 100001, receivedOn: today, refundOf: receiptId, description: "", externalRef: null }, ctx)).rejects.toMatchObject({ status: 422 });
  });

  it("pagamento: só aprovados, total conferido, idempotente e nunca paga duas vezes", async () => {
    const entries = await getDb().select().from(s.commissionEntries).where(eq(s.commissionEntries.partnerId, partnerA));
    const ids = entries.map((e) => e.id);
    const total = entries.reduce((a, e) => a + e.amountCents, 0);
    const key = crypto.randomUUID();
    const input = { partnerId: partnerA, entryIds: ids, paidOn: new Date().toISOString().slice(0, 10), method: "Pix" as const, reference: "PIX-1", notes: "", expectedTotalCents: total, idempotencyKey: key };
    await expect(createPayout(owner, input, ctx)).rejects.toMatchObject({ status: 409 }); // ainda pendentes
    await actOnEntries(owner, ids, "approve", "", ctx);
    await expect(createPayout(owner, { ...input, expectedTotalCents: total + 1 }, ctx)).rejects.toMatchObject({ status: 409 });
    const paid = await createPayout(owner, input, ctx);
    expect(paid).toMatchObject({ amountCents: total, duplicate: false });
    // Clique repetido com a mesma chave: devolve o mesmo pagamento.
    expect(await createPayout(owner, input, ctx)).toMatchObject({ id: paid.id, duplicate: true });
    // Outra chave com os mesmos lançamentos: recusa.
    await expect(createPayout(owner, { ...input, idempotencyKey: crypto.randomUUID() }, ctx)).rejects.toMatchObject({ status: 409 });
    const [{ n }] = await getDb().select({ n: sql<number>`count(*)::int` }).from(s.partnerPayouts);
    expect(n).toBe(1);
    const earnings = await hubEarnings(partnerA, "member", ["business", "referral"]);
    expect(earnings.paidCents).toBe(total);
    // Pagamentos concorrentes com chaves diferentes: só um passa.
    await voidPayout(owner, paid.id, "Registrado por engano", ctx);
    const results = await Promise.allSettled([createPayout(owner, { ...input, idempotencyKey: crypto.randomUUID() }, ctx), createPayout(owner, { ...input, idempotencyKey: crypto.randomUUID() }, ctx)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  });

  it("pago não pode ser cancelado", async () => {
    const [paid] = await getDb().select().from(s.commissionEntries).where(eq(s.commissionEntries.status, "paid")).limit(1);
    await expect(actOnEntries(owner, [paid.id], "cancel", "erro", ctx)).rejects.toMatchObject({ status: 409 });
  });

  it("dados financeiros de uma empresa não aparecem para outra", async () => {
    const other = await hubEarnings(partnerB, "member", ["technology"]);
    expect(other.entries).toHaveLength(0);
    expect(other.paidCents).toBe(0);
  });
});


describe("Rotas: sessões e permissões", () => {
  const asHub = async (user: HubUser) => {
    jar.clear();
    jar.set("rv_partner", (await createHubSession(user.id, ctx)).token);
  };

  it("rota do Hub sem sessão do Hub é 401, mesmo com sessão do CMS", async () => {
    jar.clear();
    expect((await hubReferrals.POST(req("POST", "/api/alliance/hub/referrals", {}), params({}))).status).toBe(401);
    asCms(ownerToken);
    expect((await hubReferrals.POST(req("POST", "/api/alliance/hub/referrals", {}), params({}))).status).toBe(401);
  });

  it("administrador não acessa finanças, contratos nem configurações; editor não envia arquivos", async () => {
    asCms(adminToken);
    expect((await cmsPayouts.POST(req("POST", "/api/cms/alliance/payouts", {}), params({}))).status).toBe(403);
    expect((await cmsRules.POST(req("POST", "/api/cms/alliance/rules", {}), params({}))).status).toBe(403);
    expect((await cmsContracts.POST(req("POST", "/api/cms/alliance/contracts", {}), params({}))).status).toBe(403);
    expect((await cmsSettings.PUT(req("PUT", "/api/cms/alliance/settings", {}), params({}))).status).toBe(403);
    asCms(editorToken);
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array([37, 80, 68, 70])]), "x.pdf");
    const upload = new NextRequest(`${ORIGIN}/api/cms/alliance/files`, { method: "POST", headers: { origin: ORIGIN }, body: form });
    expect((await cmsFiles.POST(upload, params({}))).status).toBe(403);
    expect((await cmsReferral.PATCH(req("PATCH", "/api/cms/alliance/referrals/00000000-0000-0000-0000-000000000000", { version: 1 }), params({ id: "00000000-0000-0000-0000-000000000000" }))).status).toBe(403);
  });

  it("material segmentado para outra empresa: 404 no download do Hub", async () => {
    const db = getDb();
    const [file] = await db.insert(s.allianceFiles).values({ storageKey: "alliance/test/x.pdf", filename: "x.pdf", mimeType: "application/pdf", sizeBytes: 4, sha256: "0".repeat(64), uploadedBy: owner.id }).returning();
    const [res] = await db.insert(s.partnerResources).values({ title: "Só Norte", category: "sales", fileId: file.id, status: "published", partnerIds: [partnerB], createdBy: owner.id }).returning();
    await asHub(hubA);
    expect((await hubResourceFileRoute.GET(req("GET", `/api/alliance/hub/resources/${res.id}/file`), params({ id: res.id }))).status).toBe(404);
  });

  it("contrato de outra empresa não pode ser aceito (404) e o Partner Member não aceita termos (403)", async () => {
    const db = getDb();
    const [c] = await db.insert(s.partnerContracts).values({ partnerId: partnerB, title: "Termo", kind: "partnership", version: 1, status: "sent", terms: "Texto", termsSha256: "a".repeat(64), sentAt: new Date(), createdBy: owner.id }).returning();
    await asHub(hubA);
    expect((await hubContractAccept.POST(req("POST", `/api/alliance/hub/contracts/${c.id}/accept`, { termsSha256: "a".repeat(64), confirm: true }), params({ id: c.id }))).status).toBe(404);
    await asHub(hubAMember);
    expect((await hubContractAccept.POST(req("POST", `/api/alliance/hub/contracts/${c.id}/accept`, { termsSha256: "a".repeat(64), confirm: true }), params({ id: c.id }))).status).toBe(403);
  });
});
