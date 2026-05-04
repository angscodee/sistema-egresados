import {
  BadRequestException,
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
import { EstadoOferta, Role } from '@prisma/client';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateOfertaDto } from './dto/create-oferta.dto';
import { FilterOfertasDto } from './dto/filter-ofertas.dto';
import { UpdateOfertaDto } from './dto/update-oferta.dto';
import { OfertasService } from './ofertas.service';

class CambiarEstadoOfertaDto {
  @IsEnum(EstadoOferta, { message: 'El estado de oferta no es válido.' })
  @IsNotEmpty({ message: 'El estado es obligatorio.' })
  estado!: EstadoOferta;
}

@Controller('ofertas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OfertasController {
  constructor(private readonly ofertasService: OfertasService) {}

  @Post()
  @Roles(Role.EMPRESA)
  create(@CurrentUser() user: Express.User, @Body() dto: CreateOfertaDto) {
    return this.ofertasService.create(user.id, dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.EMPRESA, Role.EGRESADO)
  findAll(@Query() filters: FilterOfertasDto) {
    return this.ofertasService.findAll(filters);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.EMPRESA, Role.EGRESADO)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.ofertasService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.EMPRESA, Role.ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOfertaDto,
    @CurrentUser() user: Express.User,
  ) {
    return this.ofertasService.update(id, dto, user.id, user.role);
  }

  @Patch(':id/estado')
  @Roles(Role.ADMIN)
  cambiarEstado(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CambiarEstadoOfertaDto,
  ) {
    return this.ofertasService.cambiarEstadoAdmin(id, dto.estado);
  }

  @Post(':id/cerrar')
  @Roles(Role.EMPRESA)
  cerrar(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: Express.User) {
    return this.ofertasService.cerrar(id, user.id);
  }

  @Delete(':id')
  @Roles(Role.EMPRESA, Role.ADMIN)
  delete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: Express.User) {
    return this.ofertasService.delete(id, user.id, user.role);
  }
}
