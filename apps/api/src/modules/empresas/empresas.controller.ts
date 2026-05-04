import {
  BadRequestException,
  Body,
  Controller,
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
import { getLogosDir } from '../../lib/uploads-storage';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { FilterEmpresasDto } from './dto/filter-empresas.dto';
import { RechazarEmpresaDto } from './dto/rechazar-empresa.dto';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';
import { EmpresasService } from './empresas.service';

const IMAGE_MIMETYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

@Controller('empresas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmpresasController {
  constructor(private readonly empresasService: EmpresasService) {}

  @Get()
  @Roles(Role.ADMIN)
  findAll(@Query() filters: FilterEmpresasDto) {
    return this.empresasService.findAll(filters);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.EMPRESA)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.empresasService.findOne(id);
  }

  @Post(':id/validar')
  @Roles(Role.ADMIN)
  validar(@Param('id', ParseUUIDPipe) id: string) {
    return this.empresasService.validar(id);
  }

  @Post(':id/rechazar')
  @Roles(Role.ADMIN)
  rechazar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RechazarEmpresaDto) {
    return this.empresasService.rechazar(id, dto);
  }

  @Post(':id/logo')
  @Roles(Role.ADMIN, Role.EMPRESA)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => cb(null, getLogosDir()),
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
          cb(null, `logo-${unique}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
      fileFilter: (_req, file, cb) => {
        if (IMAGE_MIMETYPES.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Solo se permiten imágenes (JPEG, PNG, WebP, GIF).'), false);
        }
      },
    }),
  )
  uploadLogo(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: Express.User,
  ) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo.');
    return this.empresasService.updateLogoUrl(id, file.filename, user.id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.EMPRESA)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmpresaDto,
    @CurrentUser() user: Express.User,
  ) {
    return this.empresasService.update(id, dto, user.id);
  }
}
