import "server-only";
import { fileTypeFromBuffer } from "file-type";
import sharp, { type Metadata, type Sharp } from "sharp";
import { sha256 } from "@oslojs/crypto/sha2";
import { encodeHexLowerCase } from "@oslojs/encoding";
import { HttpError, payloadTooLarge, unsupportedMediaType } from "@/server/http/errors";

/**
 * Validação e normalização de imagens enviadas ao CMS.
 *
 * - O tipo é detectado pelos bytes do arquivo (assinatura), nunca pela extensão ou pelo Content-Type do navegador.
 * - Só formatos raster comuns. SVG é recusado: pode carregar scripts.
 * - A imagem é decodificada e reescrita pelo sharp: isso descarta metadados (EXIF com GPS, câmera etc.),
 *   aplica a orientação correta e garante que o arquivo salvo é uma imagem válida (sem payloads escondidos).
 * - Imagens muito grandes são reduzidas para no máximo MAX_EDGE px no maior lado.
 */

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
const MAX_INPUT_PIXELS = 50_000_000;
const MIN_EDGE = 16;
const MAX_EDGE = 2560;

type Output = { mime: "image/jpeg" | "image/png" | "image/webp"; ext: "jpg" | "png" | "webp" };

export type ProcessedImage = Output & {
  buffer: Buffer;
  width: number;
  height: number;
  sizeBytes: number;
  sha256: string;
  blurDataUrl: string;
};

export async function processImage(input: Buffer): Promise<ProcessedImage> {
  if (input.length === 0) throw new HttpError(422, "empty_file", "O arquivo está vazio.");
  if (input.length > MAX_UPLOAD_BYTES) throw payloadTooLarge(`A imagem pode ter no máximo ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`);

  const detected = await fileTypeFromBuffer(input);
  if (!detected || !(ACCEPTED_TYPES as readonly string[]).includes(detected.mime)) {
    throw unsupportedMediaType("Formato não aceito. Envie JPG, PNG, WebP ou AVIF.");
  }

  let image: Sharp;
  let meta: Metadata;
  try {
    image = sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" });
    meta = await image.metadata();
  } catch {
    throw new HttpError(422, "invalid_image", "Não foi possível ler a imagem. O arquivo pode estar corrompido.");
  }
  if ((meta.pages ?? 1) > 1) throw new HttpError(422, "animated_image", "Imagens animadas não são aceitas.");

  const rotated = (meta.orientation ?? 1) >= 5;
  const width = rotated ? meta.height : meta.width;
  const height = rotated ? meta.width : meta.height;
  if (!width || !height || width < MIN_EDGE || height < MIN_EDGE) {
    throw new HttpError(422, "image_too_small", `A imagem precisa ter pelo menos ${MIN_EDGE} px de cada lado.`);
  }

  // PNG com transparência continua PNG; AVIF vira WebP (encode de AVIF é lento demais para uma requisição).
  const output: Output =
    detected.mime === "image/jpeg"
      ? { mime: "image/jpeg", ext: "jpg" }
      : detected.mime === "image/png"
        ? { mime: "image/png", ext: "png" }
        : { mime: "image/webp", ext: "webp" };

  try {
    let pipeline = image.rotate().resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true });
    pipeline =
      output.mime === "image/jpeg"
        ? pipeline.jpeg({ quality: 85, mozjpeg: true })
        : output.mime === "image/png"
          ? pipeline.png({ compressionLevel: 9, adaptiveFiltering: true })
          : pipeline.webp({ quality: 85 });
    const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });

    const blur = await sharp(data).resize(16, 16, { fit: "inside" }).webp({ quality: 40 }).toBuffer();

    return {
      ...output,
      buffer: data,
      width: info.width,
      height: info.height,
      sizeBytes: data.length,
      sha256: encodeHexLowerCase(sha256(data)),
      blurDataUrl: `data:image/webp;base64,${blur.toString("base64")}`,
    };
  } catch {
    throw new HttpError(422, "invalid_image", "Não foi possível processar a imagem. O arquivo pode estar corrompido.");
  }
}

/** Nome para exibição: sem caminho, sem caracteres de controle, tamanho limitado. */
export function sanitizeFilename(name: string) {
  const base = name.split(/[\\/]/).pop() ?? "";
  const clean = base.replace(/[\u0000-\u001f\u007f<>:"|?*]/g, "").trim().slice(0, 120);
  return clean || "imagem";
}
