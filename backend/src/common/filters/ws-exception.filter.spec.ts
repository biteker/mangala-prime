import {
  ArgumentsHost,
  BadRequestException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { WsExceptionFilter } from './ws-exception.filter';

interface MockWsClient {
  nsp?: {
    name?: string;
  };
  emit: jest.Mock;
}

function createMockArgumentsHost(client: MockWsClient): ArgumentsHost {
  return {
    switchToWs: () => ({
      getClient: () => client,
      getData: () => undefined,
      getPattern: () => '',
    }),
    switchToHttp: jest.fn(),
    switchToRpc: jest.fn(),
    getArgs: jest.fn(),
    getArgByIndex: jest.fn(),
    getType: () => 'ws',
  } as unknown as ArgumentsHost;
}

describe('WsExceptionFilter', () => {
  let filter: WsExceptionFilter;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    filter = new WsExceptionFilter();
    loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    loggerErrorSpy.mockRestore();
  });

  it('should_emit_game_error_with_extracted_code_when_http_exception_is_thrown_in_game_namespace', () => {
    // Arrange
    const client: MockWsClient = {
      nsp: { name: '/game' },
      emit: jest.fn(),
    };
    const host = createMockArgumentsHost(client);
    const exception = new NotFoundException({
      code: 'NOT_FOUND',
      message: 'Oyun odası bulunamadı.',
    });

    // Act
    filter.catch(exception, host);

    // Assert
    expect(client.emit).toHaveBeenCalledWith('game:error', {
      error: {
        code: 'NOT_FOUND',
        message: 'Oyun odası bulunamadı.',
      },
    });
  });

  it('should_emit_lobby_error_with_extracted_code_when_http_exception_is_thrown_in_lobby_namespace', () => {
    // Arrange
    const client: MockWsClient = {
      nsp: { name: '/lobby' },
      emit: jest.fn(),
    };
    const host = createMockArgumentsHost(client);
    const exception = new BadRequestException({
      code: 'TARGET_PLAYING',
      message: 'Davet edilen oyuncu şu anda başka bir maçta.',
    });

    // Act
    filter.catch(exception, host);

    // Assert
    expect(client.emit).toHaveBeenCalledWith('lobby:error', {
      error: {
        code: 'TARGET_PLAYING',
        message: 'Davet edilen oyuncu şu anda başka bir maçta.',
      },
    });
  });

  it('should_fallback_to_status_code_mapping_when_http_exception_has_no_explicit_code', () => {
    // Arrange
    const client: MockWsClient = {
      nsp: { name: '/game' },
      emit: jest.fn(),
    };
    const host = createMockArgumentsHost(client);
    const exception = new BadRequestException([
      'pitIndex must not be less than 0',
    ]);

    // Act
    filter.catch(exception, host);

    // Assert
    expect(client.emit).toHaveBeenCalledWith('game:error', {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'pitIndex must not be less than 0',
      },
    });
  });

  it('should_emit_structured_ws_exception_code_and_message', () => {
    // Arrange
    const client: MockWsClient = {
      nsp: { name: '/lobby' },
      emit: jest.fn(),
    };
    const host = createMockArgumentsHost(client);
    const exception = new WsException({
      code: 'INVALID_PARAMS',
      message: 'Geçersiz parametreler.',
    });

    // Act
    filter.catch(exception, host);

    // Assert
    expect(client.emit).toHaveBeenCalledWith('lobby:error', {
      error: {
        code: 'INVALID_PARAMS',
        message: 'Geçersiz parametreler.',
      },
    });
  });

  it('should_mask_unknown_error_as_internal_error_without_leaking_stack_trace', () => {
    // Arrange
    const client: MockWsClient = {
      nsp: { name: '/game' },
      emit: jest.fn(),
    };
    const host = createMockArgumentsHost(client);
    const unexpectedError = new Error(
      'Prisma connection pool exhausted at host 10.0.0.1',
    );

    // Act
    filter.catch(unexpectedError, host);

    // Assert
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      'Prisma connection pool exhausted at host 10.0.0.1',
      unexpectedError.stack,
    );
    expect(client.emit).toHaveBeenCalledWith('game:error', {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'İşlem sırasında beklenmeyen bir sunucu hatası oluştu.',
      },
    });
  });

  it('should_mask_internal_server_http_exception_without_leaking_internal_message', () => {
    // Arrange
    const client: MockWsClient = {
      nsp: { name: '/lobby' },
      emit: jest.fn(),
    };
    const host = createMockArgumentsHost(client);
    const exception = new InternalServerErrorException(
      'Sensitive SQL query error',
    );

    // Act
    filter.catch(exception, host);

    // Assert
    expect(loggerErrorSpy).toHaveBeenCalled();
    expect(client.emit).toHaveBeenCalledWith('lobby:error', {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'İşlem sırasında beklenmeyen bir sunucu hatası oluştu.',
      },
    });
  });
});
