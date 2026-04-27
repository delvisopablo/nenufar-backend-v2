import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CategoriaService } from './categoria.service';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';

@Controller('categorias')
export class CategoriaController {
  constructor(private service: CategoriaService) {}

  @Get()
  list(
    @Query('q') q?: string,
    @Query('sort') sort?: 'nombre' | '-nombre',
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('includeCounts') includeCounts?: string,
    @Query('includeSubcategorias') includeSubcategorias?: string,
  ) {
    return this.service.list({
      q,
      sort,
      page,
      limit,
      includeCounts,
      includeSubcategorias,
    });
  }

  @Get(':id/subcategorias')
  listSubcategorias(@Param('id', ParseIntPipe) id: number) {
    return this.service.listSubcategorias(id);
  }

  @Get(':id')
  get(
    @Param('id', ParseIntPipe) id: number,
    @Query('includeCounts') includeCounts?: string,
    @Query('includeSubcategorias') includeSubcategorias?: string,
  ) {
    return this.service.getById(id, {
      includeCounts: includeCounts === 'true',
      includeSubcategorias: includeSubcategorias === 'true',
    });
  }

  @Post()
  create(@Body() dto: CreateCategoriaDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoriaDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
