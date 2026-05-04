import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { getCvsDir } from '../../lib/uploads-storage';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AgregarHabilidadDto } from './dto/agregar-habilidad.dto';
import { CreateEgresadoDto } from './dto/create-egresado.dto';
import { FilterEgresadosDto } from './dto/filter-egresados.dto';
import { UpdateEgresadoDto } from './dto/update-egresado.dto';
import { EgresadosService } from './egresados.service';

@Controller('egresados')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EgresadosController {
  constructor(private readonly egresadosService: EgresadosService) {}

  @Post()
  @Roles(Role.EGRESADO)
  create(@CurrentUser() user: Express.User, @Body() dto: CreateEgresadoDto) {
    return this.egresadosService.create(user.id, dto);
  }

  @Get('me')
  @Roles(Role.EGRESADO)
  getMe(@CurrentUser() user: Express.User) {
    return this.egresadosService.findOne(user.id);
  }

  @Get()
  @Roles(Role.ADMIN, Role.EMPRESA, Role.EGRESADO)
  findAll(@Query() filters: FilterEgresadosDto) {
    return this.egresadosService.findAll(filters);
  }

  @Get(':id/estadisticas')
  @Roles(Role.ADMIN, Role.EGRESADO)
  estadisticas(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: Express.User) {
    if (user.role !== Role.ADMIN && user.id !== id) {
      throw new ForbiddenException('Solo puede consultar sus propias estadísticas.');
    }
    return this.egresadosService.obtenerEstadisticas(id);
  }

  @Post(':id/habilidades')
  @Roles(Role.ADMIN, Role.EGRESADO)
  agregarHabilidad(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AgregarHabilidadDto,
    @CurrentUser() user: Express.User,
  ) {
    return this.egresadosService.agregarHabilidad(id, body.habilidadId, body.nivel, user);
  }

  @Post(':id/cv')
  @Roles(Role.ADMIN, Role.EGRESADO)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => cb(null, getCvsDir()),
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
          cb(null, `cv-${unique}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
      fileFilter: (_req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
          cb(null, true);
        } else {
          cb(new BadRequestException('Solo se permiten archivos PDF.'), false);
        }
      },
    }),
  )
  uploadCv(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: Express.User,
  ) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo.');
    return this.egresadosService.updateCvUrl(id, file.filename, user);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.EMPRESA, Role.EGRESADO)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.egresadosService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.EGRESADO)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEgresadoDto,
    @CurrentUser() user: Express.User,
  ) {
    return this.egresadosService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.egresadosService.delete(id);
  }
}
