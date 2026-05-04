import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateHabilidadDto } from './dto/create-habilidad.dto';
import { UpdateHabilidadDto } from './dto/update-habilidad.dto';
import { HabilidadesService } from './habilidades.service';

@Controller('habilidades')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HabilidadesController {
  constructor(private readonly habilidadesService: HabilidadesService) {}

  @Get()
  @Roles(Role.ADMIN, Role.EGRESADO, Role.EMPRESA)
  findAll(@Query('search') search?: string) {
    return this.habilidadesService.findAll(search);
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateHabilidadDto) {
    return this.habilidadesService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateHabilidadDto) {
    return this.habilidadesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.habilidadesService.delete(id);
  }
}
