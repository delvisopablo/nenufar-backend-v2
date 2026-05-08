import { ValidationPipe } from '@nestjs/common';
import { ValidationError } from '../../common/errors/app-error';
import { validationExceptionFactory } from '../../common/pipes/validation-exception.factory';
import { RegisterNegocioDto } from './register-negocio.dto';

describe('RegisterNegocioDto', () => {
  const validationPipe = new ValidationPipe({
    whitelist: true,
    transform: true,
    exceptionFactory: validationExceptionFactory,
  });

  it('acepta aliases usados por frontend y normaliza el payload', async () => {
    const dto = (await validationPipe.transform(
      {
        nombre: ' Pablo Delviso ',
        nickname: ' pablo ',
        email: ' PABLO@example.com ',
        password: 'secreta123',
        nombreNegocio: ' Cafe Nenufar ',
        nicknameNegocio: ' cafe-nenufar ',
        categoriaId: '4',
        subcategoriaId: '9',
        descripcion: ' Cafe de especialidad ',
        direccion: ' Calle Mayor 14 ',
        nenufarActivo: ' loto-rosa ',
        codigoNenufarizacion: ' nen-001 ',
      },
      {
        type: 'body',
        metatype: RegisterNegocioDto,
      },
    )) as RegisterNegocioDto;

    expect(dto).toMatchObject({
      nombre: 'Pablo Delviso',
      nickname: 'pablo',
      email: 'pablo@example.com',
      password: 'secreta123',
      nombreNegocio: 'Cafe Nenufar',
      nicknameNegocio: 'cafe-nenufar',
      categoriaId: 4,
      subcategoriaId: 9,
      descripcion: 'Cafe de especialidad',
      direccion: 'Calle Mayor 14',
      nenufarActivo: 'loto-rosa',
      codigoNenufarizacion: 'NEN-001',
    });
  });

  it('expone details.fields cuando la validación falla', async () => {
    await expect(
      validationPipe.transform(
        {
          email: 'correo-invalido',
          password: '123',
          nombreNegocio: '',
          categoriaId: 'abc',
        },
        {
          type: 'body',
          metatype: RegisterNegocioDto,
        },
      ),
    ).rejects.toEqual(
      expect.objectContaining<Partial<ValidationError>>({
        code: 'VALIDATION_ERROR',
        message: 'Datos de entrada inválidos',
        statusCode: 400,
        details: expect.objectContaining({
          fields: expect.objectContaining({
            categoriaId: expect.any(Array),
            nombreNegocio: expect.any(Array),
            nickname: expect.any(Array),
            email: expect.any(Array),
          }),
        }),
      }),
    );
  });
});
