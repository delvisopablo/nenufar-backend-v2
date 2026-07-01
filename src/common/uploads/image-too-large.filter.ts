import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  PayloadTooLargeException,
} from '@nestjs/common';
import { createFieldError } from '../errors/app-error';
import { GlobalExceptionFilter } from '../filters/global-exception.filter';

const globalExceptionFilter = new GlobalExceptionFilter();

/**
 * Multer corta el stream y lanza PayloadTooLargeException (413) con mensaje en inglés
 * antes de que el handler llegue a ejecutarse. Este filtro lo reescribe con el
 * mensaje de validación esperado, delegando el formateo final al filtro global.
 */
export function createImageTooLargeFilter(field: string, message: string) {
  @Catch(PayloadTooLargeException)
  class ImageTooLargeFilter implements ExceptionFilter {
    catch(_exception: PayloadTooLargeException, host: ArgumentsHost) {
      globalExceptionFilter.catch(
        createFieldError('VALIDATION_ERROR', message, field, message),
        host,
      );
    }
  }

  return new ImageTooLargeFilter();
}
