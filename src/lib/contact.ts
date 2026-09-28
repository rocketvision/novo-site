/** Validação compartilhada entre o formulário (cliente) e a rota /api/contact (servidor). */

export type ContactPayload = {
  name: string;
  company: string;
  email: string;
  phone: string;
  interests: string[];
  message: string;
};

export type ContactErrors = Partial<Record<keyof ContactPayload, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContact(data: ContactPayload): ContactErrors {
  const errors: ContactErrors = {};
  if (data.name.trim().length < 2) errors.name = "Conte pra gente como podemos te chamar.";
  if (!EMAIL.test(data.email.trim())) errors.email = "Informe um e-mail válido para podermos responder.";
  if (data.message.trim().length < 10) errors.message = "Escreva um pouco mais sobre o que você precisa.";
  if (data.message.length > 4000) errors.message = "A mensagem pode ter até 4000 caracteres.";
  return errors;
}

export function normalizeContact(input: unknown): ContactPayload {
  const source = (typeof input === "object" && input !== null ? input : {}) as Record<string, unknown>;
  const text = (value: unknown, max = 300) => (typeof value === "string" ? value.slice(0, max) : "");
  return {
    name: text(source.name),
    company: text(source.company),
    email: text(source.email),
    phone: text(source.phone, 40),
    interests: Array.isArray(source.interests)
      ? source.interests.filter((v): v is string => typeof v === "string").slice(0, 10)
      : [],
    message: text(source.message, 4000),
  };
}
