import { createFieldError } from '../errors/app-error';

export const IMAGE_MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export const IMAGE_TYPE_ERROR_MESSAGE =
  'Solo se permiten imágenes JPG, PNG o WEBP.';

export type UploadedImageLike = {
  buffer?: Buffer;
  mimetype?: string;
  originalname?: string;
  size?: number;
};

function imageTypeError(field: string) {
  return createFieldError(
    'VALIDATION_ERROR',
    IMAGE_TYPE_ERROR_MESSAGE,
    field,
    IMAGE_TYPE_ERROR_MESSAGE,
  );
}

/** Rechaza pronto los tipos MIME no soportados; el contenido real se valida después con los "magic bytes" en assertValidImageUpload. */
export function imageFileFilter(field: string) {
  return (
    _req: unknown,
    file: UploadedImageLike,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    const mimeType = String(file.mimetype ?? '').toLowerCase();
    if (!IMAGE_MIME_EXTENSIONS[mimeType]) {
      callback(imageTypeError(field), false);
      return;
    }
    callback(null, true);
  };
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function matchesJpegSignature(buffer: Buffer) {
  return (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  );
}

function matchesPngSignature(buffer: Buffer) {
  return (
    buffer.length >= PNG_SIGNATURE.length &&
    PNG_SIGNATURE.every((byte, index) => buffer[index] === byte)
  );
}

function matchesWebpSignature(buffer: Buffer) {
  return (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  );
}

/** Detecta el tipo real de imagen leyendo la cabecera binaria, sin fiarse del nombre ni del Content-Type declarado por el cliente. */
function detectImageExtensionFromBuffer(buffer: Buffer): string | null {
  if (matchesJpegSignature(buffer)) return 'jpg';
  if (matchesPngSignature(buffer)) return 'png';
  if (matchesWebpSignature(buffer)) return 'webp';
  return null;
}

export function assertValidImageUpload(
  file: UploadedImageLike | undefined,
  options: {
    field: string;
    maxSize: number;
    missingMessage: string;
    tooLargeMessage: string;
  },
): string {
  if (!file?.buffer?.length) {
    throw createFieldError(
      'VALIDATION_ERROR',
      options.missingMessage,
      options.field,
      options.missingMessage,
    );
  }

  const size = Number(file.size ?? file.buffer.length);
  if (size > options.maxSize) {
    throw createFieldError(
      'VALIDATION_ERROR',
      options.tooLargeMessage,
      options.field,
      options.tooLargeMessage,
    );
  }

  const mimeType = String(file.mimetype ?? '').toLowerCase();
  const declaredExtension = IMAGE_MIME_EXTENSIONS[mimeType];
  if (!declaredExtension) {
    throw imageTypeError(options.field);
  }

  const detectedExtension = detectImageExtensionFromBuffer(file.buffer);
  if (!detectedExtension || detectedExtension !== declaredExtension) {
    throw imageTypeError(options.field);
  }

  return detectedExtension;
}
