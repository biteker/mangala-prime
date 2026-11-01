import { HttpException } from '@nestjs/common';

export function extractErrorCode(error: unknown, fallback: string): string {
  if (error instanceof HttpException) {
    const response = error.getResponse();
    if (
      typeof response === 'object' &&
      response !== null &&
      'code' in response
    ) {
      const code = (response as { readonly code?: unknown }).code;
      if (typeof code === 'string' && code.trim().length > 0) {
        return code;
      }
    }
  }

  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { readonly response?: unknown }).response;
    if (
      typeof response === 'object' &&
      response !== null &&
      'code' in response
    ) {
      const code = (response as { readonly code?: unknown }).code;
      if (typeof code === 'string' && code.trim().length > 0) {
        return code;
      }
    }
  }

  return fallback;
}
