# Créditos das imagens

A landing não usa fotografia. A abertura e o convite final usam o vídeo abaixo; as demais seções
são composições desenhadas em código em `src/components/visuals` e nas próprias seções, a partir da copy.

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

`public/video/hero-liftoff*` é o lançamento do foguete, fornecido pela Rocket Vision, tocado uma única vez. Vai da plataforma até o foguete sobre a Terra (os primeiros 4,8 s do original, sem as nuvens do fim) e termina com 2,6 s em câmera lenta com desaceleração, feita a partir de 1,25 s do original interpolado a 120 quadros por segundo. O arquivo tem 7,4 s e para no último quadro. A fonte é 720p: cada quadro foi ampliado 4× com IA (Real-ESRGAN, modelo `realesr-general-x4v3`) e reduzido para 2560 × 1440. Tratamento de cor (mais contraste e saturação, azul reforçado, nitidez leve). Recodificado sem áudio, quadro-chave a cada 2 s, em três versões, cada uma em VP9 e H.264: 2560 × 1440 para telas grandes ou de alta densidade (`hero-liftoff-1440.*`, cerca de 1,4 MB / 2,3 MB), 1920 × 1080 para os demais desktops (`hero-liftoff.*`, cerca de 1 MB / 1,4 MB) e um recorte vertical 810 × 1080 centrado no foguete para celulares e tablets em pé (`hero-liftoff-portrait.*`, cerca de 650 KB / 770 KB). `hero-liftoff-poster*.jpg` é o primeiro quadro; `hero-liftoff-still*.jpg`, o último (o foguete planando), usado quando não há vídeo.

## Vídeo do convite final

`public/video/launchpad*` vem do mesmo vídeo da abertura: os primeiros 1,75 s, com o foguete ainda na plataforma e os motores acesos. Cada quadro foi ampliado 4× com IA (Real-ESRGAN, `realesr-general-x4v3`) e reduzido para 2560 × 1440; depois, câmera lenta a 25% (interpolação a 96 quadros por segundo) e loop de 5,5 s em que o último 1,5 s se dissolve no primeiro. Mesmo tratamento de cor da abertura. Três versões, cada uma em VP9 e H.264: 2560 × 1440 (`launchpad-1440.*`, cerca de 420 KB / 670 KB), 1920 × 1080 (`launchpad.*`, cerca de 290 KB / 420 KB) e recorte vertical 810 × 1080 centrado no foguete (`launchpad-portrait.*`, cerca de 210 KB / 280 KB). `launchpad-poster*.jpg` é o primeiro quadro.

**Situação:** vídeo fornecido pela própria Rocket Vision (o mesmo da abertura).

## Ilustrações dos serviços

`public/illustrations/*.svg` vêm do [unDraw](https://undraw.co) (licença unDraw: uso livre, inclusive comercial, sem atribuição obrigatória): "Building websites" (Sites), "Add to cart" (Lojas virtuais), "Dashboard" (Sistemas), "Mobile application" (Aplicativos) e "Logo design" (Identidade visual). Recoloridas na identidade da Rocket: a cor principal `#6c63ff` vira o azul do motor do foguete na abertura (`#2c9df5`), o cinza-azulado `#3f3d56` vira o grafite da marca (`#1d1d1f`) e o rosa `#ff6584` vira um azul claro (`#8cc9fa`).
