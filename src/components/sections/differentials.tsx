import { Reveal } from "@/components/animations/reveal";
import { Eyebrow } from "@/components/ui/eyebrow";
import { differentials } from "@/content/landing";

/** Diferenciais em composição editorial: linhas, não cards. */
export function Differentials() {
  return (
    <section id="diferenciais" aria-labelledby="diferenciais-titulo" className="bg-paper py-24 md:py-36">
      <div className="container-page">
        <Reveal className="max-w-4xl">
          <Eyebrow>{differentials.eyebrow}</Eyebrow>
          <h2 id="diferenciais-titulo" className="text-headline mt-6 text-ink">
            {differentials.title}
          </h2>
        </Reveal>

        <ul className="mt-16 md:mt-24">
          {differentials.items.map((item, i) => (
            <Reveal
              as="li"
              key={item.title}
              className="group grid gap-3 border-t border-line py-8 last:border-b md:grid-cols-12 md:gap-8 md:py-10"
            >
              <span aria-hidden="true" className="text-eyebrow pt-2 text-subtle tabular-nums md:col-span-1">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="text-title text-ink transition-transform duration-500 ease-out md:col-span-5 md:group-hover:translate-x-1">
                {item.title}
              </h3>
              <p className="text-body max-w-xl text-muted md:col-span-6 md:pt-1.5">{item.body}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
