import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CambiarEstadoDto } from './dto/cambiar-estado.dto';
import { PostularDto } from './dto/postular.dto';
import { PostulacionesService } from './postulaciones.service';

@Controller('postulaciones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PostulacionesController {
  constructor(private readonly postulacionesService: PostulacionesService) {}

  @Post()
  @Roles(Role.EGRESADO)
  postular(@CurrentUser() user: Express.User, @Body() dto: PostularDto) {
    return this.postulacionesService.postular(user.id, dto.ofertaId);
  }

  @Get('mias')
  @Roles(Role.EGRESADO)
  getMisPostulaciones(@CurrentUser() user: Express.User) {
    return this.postulacionesService.getMisPostulaciones(user.id);
  }

  @Get('oferta/:ofertaId/postulantes')
  @Roles(Role.EMPRESA)
  getPostulantesPorOferta(
    @Param('ofertaId', ParseUUIDPipe) ofertaId: string,
    @CurrentUser() user: Express.User,
  ) {
    return this.postulacionesService.getPostulantesPorOferta(ofertaId, user.id);
  }

  @Patch(':id/estado')
  @Roles(Role.ADMIN, Role.EMPRESA)
  cambiarEstado(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CambiarEstadoDto,
    @CurrentUser() user: Express.User,
  ) {
    return this.postulacionesService.cambiarEstado(id, dto.nuevoEstado, user, dto.motivo);
  }
}
