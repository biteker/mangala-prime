import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import type { Socket } from 'socket.io';
import { extractErrorCode } from './error-code.util';

interface StructuredWsErrorPayload {
  readonly code?: unknown;
  readonly message?: unknown;
}

const INTERNAL_ERROR_MESSAGE =
  'İşlem sırasında beklenmeyen bir sunucu hatası oluştu.';

@Catch()
export class WsExceptionFilter extends BaseWsExceptionFilter<unknown> {
  private readonly wsLogger = new Logger(WsExceptionFilter.name);

  override catch(exception: unknown, host: ArgumentsHost): void {
    const client = host.switchToWs().getClient<Socket>();
    const eventName = this.resolveEventName(client);
    const errorPayload = this.resolveErrorPayload(exception);

    client.emit(eventName, {
      error: errorPayload,
    });
  }

  private resolveEventName(
    client: Pick<Socket, 'nsp'> | { readonly nsp?: { readonly name?: string } },
  ): 'game:error' | 'lobby:error' {
    return client?.nsp?.name === '/lobby' ? 'lobby:error' : 'game:error';
  }

  private resolveErrorPayload(exception: unknown): {
    code: string;
    message: string;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const fallbackCode = this.mapStatusToCode(status);
      const code = extractErrorCode(exception, fallbackCode);

      if (status >= 500 && code === 'INTERNAL_ERROR') {
        this.wsLogger.error(exception.message, exception.stack);
        return {
          code: 'INTERNAL_ERROR',
          message: INTERNAL_ERROR_MESSAGE,
        };
      }

      const message = this.extractHttpExceptionMessage(exception);
      return { code, message };
    }

    if (exception instanceof WsException) {
      const wsError = exception.getError();
      if (typeof wsError === 'string' && wsError.trim().length > 0) {
        return {
          code: 'WS_ERROR',
          message: wsError,
        };
      }

      if (typeof wsError === 'object' && wsError !== null) {
        const structured = wsError as StructuredWsErrorPayload;
        const code =
          typeof structured.code === 'string' &&
          structured.code.trim().length > 0
            ? structured.code
            : extractErrorCode(exception, 'WS_ERROR');
        const message =
          typeof structured.message === 'string' &&
          structured.message.trim().length > 0
            ? structured.message
            : exception.message || 'WebSocket işlem hatası.';

        return { code, message };
      }

      return {
        code: 'WS_ERROR',
        message: exception.message || 'WebSocket işlem hatası.',
      };
    }

    if (exception instanceof Error) {
      this.wsLogger.error(exception.message, exception.stack);
    } else {
      this.wsLogger.error('Unexpected WebSocket exception', String(exception));
    }

    return {
      code: 'INTERNAL_ERROR',
      message: INTERNAL_ERROR_MESSAGE,
    };
  }

  private extractHttpExceptionMessage(exception: HttpException): string {
    const response = exception.getResponse();
    if (typeof response === 'string' && response.trim().length > 0) {
      return response;
    }

    if (typeof response === 'object' && response !== null) {
      const structured = response as StructuredWsErrorPayload;
      if (Array.isArray(structured.message)) {
        const joined = structured.message
          .filter((item): item is string => typeof item === 'string')
          .join(', ');
        if (joined.length > 0) {
          return joined;
        }
      } else if (
        typeof structured.message === 'string' &&
        structured.message.trim().length > 0
      ) {
        return structured.message;
      }
    }

    return exception.message;
  }

  private mapStatusToCode(status: HttpStatus): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'VALIDATION_ERROR';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'RATE_LIMITED';
      default:
        return 'INTERNAL_ERROR';
    }
  }
}
