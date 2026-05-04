import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { TRPCError } from '@trpc/server';

export function toTrpcError(error: unknown): never {
  if (error instanceof NotFoundException) {
    throw new TRPCError({ code: 'NOT_FOUND', message: error.message });
  }
  if (error instanceof ConflictException) {
    throw new TRPCError({ code: 'CONFLICT', message: error.message });
  }
  if (error instanceof ForbiddenException) {
    throw new TRPCError({ code: 'FORBIDDEN', message: error.message });
  }
  if (error instanceof BadRequestException) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: error.message });
  }
  throw error;
}

export async function withService<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    toTrpcError(e);
  }
}
