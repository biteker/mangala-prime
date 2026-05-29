import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'INTERNAL_ERROR';
    let errorMessage = 'Internal server error';

    if (exception instanceof HttpException) {
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
          break;
        default:
          errorCode = 'INTERNAL_ERROR';
      }

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as any;
        if (Array.isArray(responseObj.message)) {
          errorMessage = responseObj.message.join(', ');
        } else if (responseObj.message) {
          errorMessage = responseObj.message;
        }

        if (responseObj.code) {
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
