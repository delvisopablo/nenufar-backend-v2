import { Controller, Get, Header, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { BuscarQueryDto } from './dto/buscar-query.dto';

@ApiTags('Busqueda')
@Controller('buscar')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @Header('Cache-Control', 'public, max-age=15, stale-while-revalidate=60')
  buscar(@Query() query: BuscarQueryDto) {
    return this.searchService.buscar(query.q, query.limit);
  }
}
