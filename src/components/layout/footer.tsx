import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { nav, site } from "@/lib/site";

export function Footer() {
  const { email, phone, whatsapp } = site.contact;
  const contactLinks = [
    email && { label: email, href: `mailto:${email}` },
    whatsapp && { label: "WhatsApp", href: `https://wa.me/${whatsapp}` },
    phone && { label: phone, href: `tel:${phone.replace(/[^\d+]/g, "")}` },
  ].filter(Boolean) as { label: string; href: string }[];

  const year = new Date().getFullYear();

  return (
    <footer className="bg-ink text-white/60" data-header="dark">
      <div className="container-page border-t border-white/10 py-14 md:py-16">
        <div className="flex flex-col gap-12 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xs space-y-4">
            <Link href="/" className="text-white" aria-label="Rocket Vision, voltar ao início">
              <Logo />
            </Link>
            <p className="text-sm leading-relaxed">
              Sites, lojas virtuais, sistemas e aplicativos para empresas que querem crescer com organização.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 text-sm sm:grid-cols-3 md:gap-16">
            <nav aria-label="Rodapé">
              <p className="text-eyebrow mb-4 text-white/50">Navegação</p>
              <ul className="space-y-3">
                {nav.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="link-underline transition-colors hover:text-white">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div>
              <p className="text-eyebrow mb-4 text-white/50">Contato</p>
              <ul className="space-y-3">
                <li>
                  <Link href="/#contato" className="link-underline transition-colors hover:text-white">
                    Fale sobre seu projeto
                  </Link>
                </li>
                {contactLinks.map((item) => (
                  <li key={item.href}>
                    <a href={item.href} className="link-underline transition-colors hover:text-white">
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {site.social.length > 0 && (
              <div>
                <p className="text-eyebrow mb-4 text-white/50">Redes</p>
                <ul className="space-y-3">
                  {site.social.map((item) => (
                    <li key={item.href}>
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link-underline transition-colors hover:text-white"
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-white/50 sm:flex-row sm:justify-between">
          <p>
            © {year} {site.legal.companyName || site.name}. Todos os direitos reservados.
          </p>
          {site.legal.cnpj && <p>CNPJ {site.legal.cnpj}</p>}
        </div>
      </div>
    </footer>
  );
}
