import { loadAppConfig } from './app-config';

describe('loadAppConfig', () => {
  const validBaseEnv: NodeJS.ProcessEnv = {
    NODE_ENV: 'development',
    DATABASE_URL: 'postgresql://postgres:password@localhost:5432/mangala_db',
    JWT_SECRET: 'a_very_secure_jwt_secret_at_least_32_chars_long_1',
    JWT_REFRESH_SECRET: 'a_very_secure_refresh_secret_at_least_32_chars_2',
    CORS_ORIGIN: 'http://localhost:5173',
    GAME_TURN_TIME_LIMIT_SECS: '59',
    PORT: '3000',
  };

  it('should_throw_when_jwt_secret_missing', () => {
    // Arrange
    const env: NodeJS.ProcessEnv = { ...validBaseEnv, JWT_SECRET: '' };

    // Act & Assert
    expect(() => loadAppConfig(env)).toThrow('JWT_SECRET');
  });

  it('should_throw_when_jwt_secret_shorter_than_32', () => {
    // Arrange
    const shortSecret = 'short_secret_12345';
    const env: NodeJS.ProcessEnv = { ...validBaseEnv, JWT_SECRET: shortSecret };

    // Act & Assert
    expect(() => loadAppConfig(env)).toThrow('JWT_SECRET');
    expect(() => loadAppConfig(env)).not.toThrow(shortSecret);
  });

  it('should_throw_when_access_and_refresh_secrets_equal', () => {
    // Arrange
    const identicalSecret = 'identical_secret_that_is_over_32_characters_long';
    const env: NodeJS.ProcessEnv = {
      ...validBaseEnv,
      JWT_SECRET: identicalSecret,
      JWT_REFRESH_SECRET: identicalSecret,
    };

    // Act & Assert
    expect(() => loadAppConfig(env)).toThrow(
      'JWT_SECRET and JWT_REFRESH_SECRET must be different',
    );
  });

  it('should_require_cors_origin_in_production', () => {
    // Arrange
    const env: NodeJS.ProcessEnv = {
      ...validBaseEnv,
      NODE_ENV: 'production',
      CORS_ORIGIN: undefined,
    };

    // Act & Assert
    expect(() => loadAppConfig(env)).toThrow('CORS_ORIGIN');
  });

  it('should_default_cors_origin_in_development', () => {
    // Arrange
    const env: NodeJS.ProcessEnv = {
      ...validBaseEnv,
      NODE_ENV: 'development',
      CORS_ORIGIN: undefined,
    };

    // Act
    const config = loadAppConfig(env);

    // Assert
    expect(config.corsOrigins).toEqual(['http://localhost:5173']);
  });

  it('should_parse_comma_separated_cors_origins', () => {
    // Arrange
    const env: NodeJS.ProcessEnv = {
      ...validBaseEnv,
      CORS_ORIGIN: ' https://mangala.example.com , http://localhost:5173 , ',
    };

    // Act
    const config = loadAppConfig(env);

    // Assert
    expect(config.corsOrigins).toEqual([
      'https://mangala.example.com',
      'http://localhost:5173',
    ]);
  });

  it('should_reject_turn_limit_out_of_range', () => {
    // Arrange
    const tooLowEnv: NodeJS.ProcessEnv = {
      ...validBaseEnv,
      GAME_TURN_TIME_LIMIT_SECS: '9',
    };
    const tooHighEnv: NodeJS.ProcessEnv = {
      ...validBaseEnv,
      GAME_TURN_TIME_LIMIT_SECS: '301',
    };

    // Act & Assert
    expect(() => loadAppConfig(tooLowEnv)).toThrow('GAME_TURN_TIME_LIMIT_SECS');
    expect(() => loadAppConfig(tooHighEnv)).toThrow(
      'GAME_TURN_TIME_LIMIT_SECS',
    );
  });
});
