import { Controller, Get, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificacionesService } from './notificaciones.service';

@Controller('notificaciones')
@UseGuards(JwtAuthGuard)
export class NotificacionesController {
  constructor(private readonly notificacionesService: NotificacionesService) {}

  @Get()
  misNotificaciones(@CurrentUser() user: Express.User) {
    return this.notificacionesService.getMisNotificaciones(user.id);
  }

  @Patch('leer-todas')
  marcarTodasLeidas(@CurrentUser() user: Express.User) {
    return this.notificacionesService.marcarTodasLeidas(user.id);
  }

  @Patch(':id/leer')
  marcarLeida(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: Express.User) {
    return this.notificacionesService.marcarLeida(id, user.id);
  }
}
