import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    const { method, url, ip } = req;
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const ms = Date.now() - start;
          this.logger.log(
            JSON.stringify({
              type: 'request',
              method,
              url,
              status: res.statusCode,
              ms,
              ip,
            }),
          );
        },
        error: (err: unknown) => {
          const ms = Date.now() - start;
          const status =
            typeof err === 'object' && err !== null && 'status' in err
              ? (err as { status: number }).status
              : 500;
          this.logger.warn(
            JSON.stringify({
              type: 'request_error',
              method,
              url,
              status,
              ms,
              ip,
              error: err instanceof Error ? err.message : String(err),
            }),
          );
        },
      }),
    );
  }
}
