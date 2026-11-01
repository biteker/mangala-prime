import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Response } from 'express';

interface StructuredErrorResponse {
  readonly code?: string;
  readonly message?: string | readonly string[];
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'INTERNAL_ERROR';
    let errorMessage = 'Internal server error';

    if (exception instanceof ThrottlerException) {
      status = HttpStatus.TOO_MANY_REQUESTS;
      errorCode = 'RATE_LIMITED';
      errorMessage = 'Çok fazla istek. Lütfen biraz bekleyin.';
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      errorMessage = exception.message;

      switch (status) {
        case HttpStatus.BAD_REQUEST:
          errorCode = 'VALIDATION_ERROR';
          break;
        case HttpStatus.UNAUTHORIZED:
          errorCode = 'UNAUTHORIZED';
          break;
        case HttpStatus.FORBIDDEN:
          errorCode = 'FORBIDDEN';
          break;
        case HttpStatus.NOT_FOUND:
          errorCode = 'NOT_FOUND';
          break;
        case HttpStatus.CONFLICT:
          errorCode = 'CONFLICT';
          break;
        case HttpStatus.TOO_MANY_REQUESTS:
          errorCode = 'RATE_LIMITED';
          errorMessage = 'Çok fazla istek. Lütfen biraz bekleyin.';
          break;
        default:
          errorCode = 'INTERNAL_ERROR';
      }

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as StructuredErrorResponse;
        if (Array.isArray(responseObj.message)) {
          errorMessage = responseObj.message.join(', ');
        } else if (
          typeof responseObj.message === 'string' &&
          responseObj.message.length > 0
        ) {
          errorMessage = responseObj.message;
        }

        if (
          typeof responseObj.code === 'string' &&
          responseObj.code.length > 0
        ) {
          errorCode = responseObj.code;
        }
      }
    } else if (exception instanceof Error) {
      errorMessage = exception.message;
    }

    response.status(status).json({
      error: {
        code: errorCode,
        message: errorMessage,
      },
    });
  }
}
