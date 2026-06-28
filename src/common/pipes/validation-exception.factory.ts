import { ValidationError as ClassValidatorError } from 'class-validator';
import { AppError } from '../errors/app-error';

type FlattenedValidation = {
  fields: Record<string, string[]>;
  fieldErrors: Record<string, string>;
  codes: string[];
};

const REQUIRED_CONSTRAINTS = new Set(['isNotEmpty', 'isDefined']);

function dtoName(error: ClassValidatorError, fallback = '') {
  return error.target?.constructor?.name ?? fallback;
}

function codeForConstraint(dto: string, property: string, constraint: string) {
  if (REQUIRED_CONSTRAINTS.has(constraint)) {
    if (dto === 'CreatePromocionDto' && property === 'titulo') {
      return 'PROMOTION_TITLE_REQUIRED';
    }
    if (
      (dto === 'CreateProductoDto' || dto === 'UpdateProductoDto') &&
      property === 'nombre'
    ) {
      return 'PRODUCT_NAME_REQUIRED';
    }
    if (dto === 'CreateResenaDto' && property === 'contenido') {
      return 'REVIEW_CONTENT_REQUIRED';
    }
    if (dto === 'CreateListaDto' && property === 'nombre') {
      return 'LIST_NAME_REQUIRED';
    }
    if (dto === 'VerifyEmailDto' && property === 'code') {
      return 'VERIFICATION_CODE_REQUIRED';
    }
    if (dto === 'ImportarCodigoDto' && property === 'codigo') {
      return 'INVALID_LIST_CODE';
    }

    return 'REQUIRED_FIELD';
  }

  if (constraint === 'isEmail') {
    return 'INVALID_EMAIL';
  }

  if (
    constraint === 'minLength' &&
    ['password', 'newPassword', 'confirmPassword'].includes(property)
  ) {
    return 'PASSWORD_TOO_SHORT';
  }

  if (dto === 'VerifyEmailDto' && property === 'code') {
    return 'VERIFICATION_CODE_INVALID';
  }

  if (property === 'puntuacion') {
    return 'INVALID_RATING';
  }

  if (property === 'precio') {
    return 'INVALID_PRICE';
  }

  if (property.toLowerCase().includes('stock')) {
    return 'INVALID_STOCK';
  }

  if (property === 'descuento') {
    return 'INVALID_DISCOUNT';
  }

  if (property === 'cantidad') {
    return 'INVALID_QUANTITY';
  }

  if (dto === 'CreatePromocionDto' || dto === 'UpdatePromocionDto') {
    if (property === 'fechaInicio' || property === 'fechaCaducidad') {
      return 'INVALID_PROMOTION_DATE';
    }
  }

  if (
    (dto === 'CreateReservaDto' || dto === 'UpdateReservaDto') &&
    property === 'fecha'
  ) {
    return 'INVALID_RESERVATION_DATE';
  }

  if (dto === 'CreateListaDto' && property === 'nombre') {
    return 'LIST_NAME_REQUIRED';
  }

  if (dto === 'ImportarCodigoDto' && property === 'codigo') {
    return 'INVALID_LIST_CODE';
  }

  if (property === 'nickname' && constraint === 'matches') {
    return 'INVALID_NICKNAME';
  }

  return 'VALIDATION_ERROR';
}

function messageForConstraint(
  dto: string,
  property: string,
  constraint: string,
  fallback: string,
) {
  if (REQUIRED_CONSTRAINTS.has(constraint)) {
    if (dto === 'CreatePromocionDto' && property === 'titulo') {
      return 'El título de la promoción es obligatorio.';
    }
    if (
      (dto === 'CreateProductoDto' || dto === 'UpdateProductoDto') &&
      property === 'nombre'
    ) {
      return 'El nombre del producto es obligatorio.';
    }
    if (dto === 'CreateResenaDto' && property === 'contenido') {
      return 'El contenido de la reseña es obligatorio.';
    }
    if (dto === 'CreateListaDto' && property === 'nombre') {
      return 'El nombre de la lista es obligatorio.';
    }
    if (dto === 'VerifyEmailDto' && property === 'code') {
      return 'El código de verificación es obligatorio.';
    }
    if (property === 'email') {
      return 'El email es obligatorio.';
    }
    if (property === 'password' || property === 'newPassword') {
      return 'La contraseña es obligatoria.';
    }
    if (property === 'nombreNegocio') {
      return 'El nombre del negocio es obligatorio.';
    }
    if (property === 'categoriaId') {
      return 'La categoría es obligatoria.';
    }

    return 'Este campo es obligatorio.';
  }

  if (constraint === 'isEmail') {
    return 'El correo introducido no tiene un formato válido.';
  }

  if (
    constraint === 'minLength' &&
    ['password', 'newPassword', 'confirmPassword'].includes(property)
  ) {
    return 'La contraseña debe tener al menos 8 caracteres.';
  }

  if (dto === 'VerifyEmailDto' && property === 'code') {
    return 'El código de verificación debe tener 6 dígitos.';
  }

  if (property === 'nickname' && constraint === 'matches') {
    return 'El nickname solo puede usar letras, números, guion, punto o guion bajo.';
  }

  if (property === 'puntuacion') {
    return 'La puntuación debe estar entre 1 y 5.';
  }

  if (property === 'precio') {
    return 'El precio no puede ser negativo.';
  }

  if (property.toLowerCase().includes('stock')) {
    return 'El stock no puede ser negativo.';
  }

  if (property === 'descuento') {
    return 'El descuento no es válido.';
  }

  if (property === 'cantidad') {
    return 'La cantidad debe ser positiva.';
  }

  if (
    property === 'fecha' ||
    property === 'fechaInicio' ||
    property === 'fechaCaducidad' ||
    property === 'fechaFundacion'
  ) {
    return 'La fecha indicada no es válida.';
  }

  return fallback;
}

function orderedConstraints(error: ClassValidatorError) {
  const entries = Object.entries(error.constraints ?? {});
  return entries.sort(([left], [right]) => {
    const leftRequired = REQUIRED_CONSTRAINTS.has(left);
    const rightRequired = REQUIRED_CONSTRAINTS.has(right);
    if (leftRequired === rightRequired) {
      return 0;
    }
    return leftRequired ? -1 : 1;
  });
}

function flattenValidationErrors(
  errors: ClassValidatorError[],
): FlattenedValidation {
  const result: Record<string, string[]> = {};
  const fieldErrors: Record<string, string> = {};
  const codes: string[] = [];

  function visit(
    error: ClassValidatorError,
    parentPath = '',
    parentDto = dtoName(error),
  ) {
    const path = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;
    const currentDto = dtoName(error, parentDto);

    if (error.constraints) {
      const messages = orderedConstraints(error).map(
        ([constraint, rawMessage]) =>
          messageForConstraint(
            currentDto,
            error.property,
            constraint,
            rawMessage,
          ),
      );

      result[path] = messages;
      fieldErrors[path] = messages[0];
      const [firstConstraint] = orderedConstraints(error)[0] ?? [];
      codes.push(
        firstConstraint
          ? codeForConstraint(currentDto, error.property, firstConstraint)
          : 'VALIDATION_ERROR',
      );
    }

    for (const child of error.children ?? []) {
      visit(child, path, currentDto);
    }
  }

  for (const error of errors) {
    visit(error);
  }

  return { fields: result, fieldErrors, codes };
}

export function validationExceptionFactory(errors: ClassValidatorError[]) {
  const { fields, fieldErrors, codes } = flattenValidationErrors(errors);
  const uniqueCodes = [...new Set(codes)];
  const code = uniqueCodes.length === 1 ? uniqueCodes[0] : 'VALIDATION_ERROR';
  const message =
    code === 'VALIDATION_ERROR'
      ? 'Datos de entrada inválidos'
      : Object.values(fieldErrors)[0] || 'Datos de entrada inválidos';

  return new AppError(code, message, 400, {
    fields,
    fieldErrors,
  });
}
