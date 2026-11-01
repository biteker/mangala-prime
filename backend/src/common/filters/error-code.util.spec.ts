import { BadRequestException, ConflictException } from '@nestjs/common';
import { extractErrorCode } from './error-code.util';

describe('extractErrorCode', () => {
  it('should_extract_code_from_http_exception_with_structured_response', () => {
    // Arrange
    const exception = new ConflictException({
      code: 'SELF_INVITE',
      message: 'Kendinize davet gönderemezsiniz.',
    });

    // Act
    const code = extractErrorCode(exception, 'INVITE_FAILED');

    // Assert
    expect(code).toBe('SELF_INVITE');
  });

  it('should_return_fallback_when_http_exception_has_no_code_field', () => {
    // Arrange
    const exception = new BadRequestException('Simple string message');

    // Act
    const code = extractErrorCode(exception, 'INVITE_FAILED');

    // Assert
    expect(code).toBe('INVITE_FAILED');
  });

  it('should_return_fallback_for_generic_error_or_non_object', () => {
    // Act & Assert
    expect(extractErrorCode(new Error('Generic error'), 'DEFAULT_CODE')).toBe(
      'DEFAULT_CODE',
    );
    expect(extractErrorCode(null, 'DEFAULT_CODE')).toBe('DEFAULT_CODE');
    expect(extractErrorCode('raw string', 'DEFAULT_CODE')).toBe('DEFAULT_CODE');
  });
});
