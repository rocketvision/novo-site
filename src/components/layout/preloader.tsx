/**
 * Abertura com o símbolo da Rocket: o anel se desenha, o foguete vibra, decola
 * deixando o rastro e a cortina sobe revelando a página.
 *
 * Animação 100% CSS (globals.css, seção "Preloader"): funciona sem JavaScript,
 * não atrasa a hidratação e se desliga sozinha. Aparece a cada carregamento completo
 * da página (F5 ou primeira visita), mas não na navegação interna entre rotas,
 * porque o layout permanece montado. É pulada com prefers-reduced-motion.
 */
export function Preloader() {
  return (
    <div className="preloader" aria-hidden="true">
      <div className="preloader-mark">
        <svg viewBox="0 0 32 32" fill="none" className="size-28 overflow-visible text-white md:size-32">
          <path
            className="preloader-ring"
            pathLength={1}
            d="M29.16 11.21A14 14 0 0 1 11.21 29.16"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <path
            className="preloader-ring"
            pathLength={1}
            d="M2.84 20.79A14 14 0 0 1 20.79 2.84"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <g className="preloader-rocket">
            <g transform="rotate(45 16 16)">
              <path className="preloader-trail" d="M16 21.2v14" stroke="url(#preloader-flame)" strokeWidth="1.6" strokeLinecap="round" />
              <g className="preloader-body" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M16 6c3 2.5 3.5 6 3 14h-6c-.5-8 0-11.5 3-14Zm1.6 6.5a1.6 1.6 0 1 0-3.2 0 1.6 1.6 0 1 0 3.2 0Z"
                />
                <path d="M13 15.5 10.5 18.5V21l2.5-1ZM19 15.5l2.5 3V21l-2.5-1Z" />
              </g>
            </g>
          </g>
          <defs>
            <linearGradient id="preloader-flame" x1="0" y1="21" x2="0" y2="35" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#ff5b1f" />
              <stop offset="1" stopColor="#ff5b1f" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
        <p className="preloader-word text-eyebrow mt-8 text-white/60">Rocket Vision</p>
      </div>
    </div>
  );
}
