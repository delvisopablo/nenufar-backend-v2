import { ValidationError as ClassValidatorError } from 'class-validator';
import { ValidationError } from '../errors/app-error';

function flattenValidationErrors(errors: ClassValidatorError[]) {
  const result: Record<string, string[]> = {};

  function visit(error: ClassValidatorError, parentPath = '') {
    const path = parentPath ? `${parentPath}.${error.property}` : error.property;

    if (error.constraints) {
      result[path] = Object.values(error.constraints);
    }

    for (const child of error.children ?? []) {
      visit(child, path);
    }
  }

  for (const error of errors) {
    visit(error);
  }

  return result;
}

export function validationExceptionFactory(errors: ClassValidatorError[]) {
  return new ValidationError('Datos de entrada inválidos', {
    fields: flattenValidationErrors(errors),
  });
}
