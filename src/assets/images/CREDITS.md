# Créditos das imagens

Direção de arte "Ofício": três fotografias da mesma família de luz (baixa, quente, fundo escuro).
As demais seções (O que muda, manifesto e serviços) têm composições desenhadas em código
em `src/components/visuals`, a partir da própria copy, e não dependem de arquivos de imagem.

| Arquivo | Seção | Fonte e página original | Autor e coleção | Licença |
|---|---|---|---|---|
| `violin-maker-hands.jpg` | Por que a Rocket | Getty Images, ID 482564297, https://www.gettyimages.com/detail/photo/violin-maker-at-work-close-up-of-hands-royalty-free-image/482564297 | Kathrin Ziegler, Stone | Royalty-free criativa, com autorização de modelo e propriedade |
| `concrete-stairs-light.jpg` | Como trabalhamos | Getty Images, ID 1897228123, https://www.gettyimages.com/detail/photo/light-effects-on-concrete-walls-and-staircases-royalty-free-image/1897228123 | zhihao, Moment | Royalty-free, sem necessidade de autorização |
| `bistro-table-for-two.jpg` | Próximo passo | Getty Images, ID 1623569581, https://www.gettyimages.com/detail/photo/restaurant-interior-royalty-free-image/1623569581 | wilatlak villette, Moment | Royalty-free, sem necessidade de autorização |

**Situação:** as três fotos ainda não foram licenciadas. Os arquivos atuais são os previews oficiais
com marca d'água, usados só para revisão no preview da Vercel. **Não publicar em produção assim.**
Antes do merge, substitua cada arquivo pelo original licenciado no mesmo caminho, registre aqui
o número da licença e faça o merge com squash, para os previews não entrarem no histórico da main.

Ajustes de enquadramento: a foto da escada é espelhada na horizontal para subir no sentido da leitura;
Por que a Rocket e Como trabalhamos usam enquadramentos da mesma foto (ver `src/lib/framing.ts`).

## Projetos de exemplo (rota /projetos)

As telas em `projects/` foram desenhadas e renderizadas para este site: marcas, pessoas e dados são fictícios.
As fotografias que aparecem dentro das telas também são do Unsplash, sob a mesma licença:

- https://unsplash.com/photos/3-brown-clay-vases-on-white-concrete-table-zeGT9j4ltRA
- https://unsplash.com/photos/ceramic-vases-on-wooden-surface-R0qthXq3jec
- https://unsplash.com/photos/brown-ceramic-cup-on-white-ceramic-saucer-85u5oGSBJ1s
- https://unsplash.com/photos/a-stack-of-bowls-and-a-vase-Uo2W75MB8uU
- https://unsplash.com/photos/filed-stoneware-jugs-G8vPQ-XVxxY
- https://unsplash.com/photos/white-ceramic-bowl-on-brown-wooden-table-vG9Y8YvzdSQ
- https://unsplash.com/photos/modern-concrete-and-wood-house-with-trees-F-slnkFvcag
- https://unsplash.com/photos/modern-white-house-with-dark-windows-under-cloudy-sky-JFj3NcgG-IU
- https://unsplash.com/photos/modern-house-with-white-walls-t4FMbSdmeR0
- https://unsplash.com/photos/cheeseburger-with-fresh-vegetables-_qxbJUr9RqI
- https://unsplash.com/photos/double-cheeseburger-with-pickles-pu6b4yIlQF4
- https://unsplash.com/photos/burger-with-vegetable-on-brown-wooden-tray-I7A_pHLcQK8
- https://unsplash.com/photos/hamburger-by-french-fries-on-board-uVPV_nV17Tw
- https://unsplash.com/photos/floating-deconstructed-burger-with-ingredients-hyIE90CN6b0
- https://unsplash.com/photos/rm7rZYdl3rY
- https://unsplash.com/photos/pTrhfmj2jDA
- https://unsplash.com/photos/H9lg5Noj660

## Vídeo de abertura

`public/hero-loop.mp4` (e o quadro `public/hero-poster.jpg`) vem do template de prompt "Fluxora", baixado uma vez e servido pelo próprio site. Foi recodificado sem áudio (H.264, 1280 × 720, cerca de 1,6 MB).

**Situação:** o direito de uso comercial precisa ser confirmado antes da produção. Se não for possível, o vídeo é trocado por um fundo gerado em código com o mesmo layout.
