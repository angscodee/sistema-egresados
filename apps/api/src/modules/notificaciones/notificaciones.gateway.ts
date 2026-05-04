import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Notificacion } from '@prisma/client';
import jwt from 'jsonwebtoken';
import type { Server, Socket } from 'socket.io';

type JwtPayload = { sub: string };

function parseCorsOrigins(): boolean | string[] {
  const raw = process.env.CORS_ORIGIN;
  if (!raw) return true;
  return raw.split(',').map((o) => o.trim());
}

@WebSocketGateway({
  cors: {
    origin: parseCorsOrigins(),
    credentials: true,
  },
})
export class NotificacionesGateway implements OnGatewayConnection {
  private readonly logger = new Logger(NotificacionesGateway.name);

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    const secret = process.env.JWT_SECRET;
    const token =
      typeof client.handshake.auth?.token === 'string'
        ? client.handshake.auth.token
        : typeof client.handshake.query?.token === 'string'
          ? (client.handshake.query.token as string)
          : null;

    if (!secret || !token) {
      client.disconnect(true);
      return;
    }

    try {
      const payload = jwt.verify(token, secret) as JwtPayload;
      if (!payload?.sub) {
        client.disconnect(true);
        return;
      }
      void client.join(`user:${payload.sub}`);
    } catch {
      this.logger.debug('Conexión WebSocket rechazada: token inválido.');
      client.disconnect(true);
    }
  }

  emitNuevaNotificacion(usuarioId: string, notificacion: Notificacion) {
    if (!this.server) return;
    const payload = {
      notificacion: {
        ...notificacion,
        createdAt: notificacion.createdAt.toISOString(),
      },
    };
    this.server.to(`user:${usuarioId}`).emit('nueva-notificacion', payload);
  }
}
