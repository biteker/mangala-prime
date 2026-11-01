export type NodeEnvironment = 'development' | 'production' | 'test';

export interface AppConfig {
  readonly nodeEnv: NodeEnvironment;
  readonly port: number;
  readonly jwtSecret: string;
  readonly jwtRefreshSecret: string;
  readonly corsOrigins: readonly string[];
  readonly turnTimeLimitSecs: number;
  readonly databaseUrl: string;
}

export const APP_CONFIG = Symbol('APP_CONFIG');

const MIN_SECRET_LENGTH = 32;
const MIN_TURN_LIMIT_SECS = 10;
const MAX_TURN_LIMIT_SECS = 300;
const DEFAULT_TURN_LIMIT_SECS = 59;
const DEFAULT_PORT = 3000;
const DEFAULT_DEV_CORS_ORIGIN = 'http://localhost:5173';

export function loadAppConfig(env: NodeJS.ProcessEnv): AppConfig {
  const rawNodeEnv = env.NODE_ENV?.trim() || 'development';
  const nodeEnv: NodeEnvironment =
    rawNodeEnv === 'production' || rawNodeEnv === 'test' ? rawNodeEnv : 'development';

  const databaseUrl = env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error('Config validation error: DATABASE_URL is required and cannot be empty.');
  }

  const jwtSecret = env.JWT_SECRET?.trim();
  if (!jwtSecret) {
    throw new Error('Config validation error: JWT_SECRET is required and cannot be empty.');
  }
  if (jwtSecret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `Config validation error: JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters long.`,
    );
  }

  const jwtRefreshSecret = env.JWT_REFRESH_SECRET?.trim();
  if (!jwtRefreshSecret) {
    throw new Error('Config validation error: JWT_REFRESH_SECRET is required and cannot be empty.');
  }
  if (jwtRefreshSecret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `Config validation error: JWT_REFRESH_SECRET must be at least ${MIN_SECRET_LENGTH} characters long.`,
    );
  }

  if (jwtSecret === jwtRefreshSecret) {
    throw new Error(
      'Config validation error: JWT_SECRET and JWT_REFRESH_SECRET must be different.',
    );
  }

  const rawCorsOrigin = env.CORS_ORIGIN?.trim();
  let corsOrigins: readonly string[];

  if (rawCorsOrigin) {
    const parsedOrigins = rawCorsOrigin
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0);

    if (parsedOrigins.length === 0) {
      throw new Error('Config validation error: CORS_ORIGIN cannot be empty when specified.');
    }
    corsOrigins = Object.freeze(parsedOrigins);
  } else if (nodeEnv === 'production') {
    throw new Error(
      'Config validation error: CORS_ORIGIN is required when NODE_ENV is production.',
    );
  } else {
    corsOrigins = Object.freeze([DEFAULT_DEV_CORS_ORIGIN]);
  }

  let turnTimeLimitSecs = DEFAULT_TURN_LIMIT_SECS;
  if (env.GAME_TURN_TIME_LIMIT_SECS !== undefined && env.GAME_TURN_TIME_LIMIT_SECS.trim() !== '') {
    const parsedLimit = Number(env.GAME_TURN_TIME_LIMIT_SECS.trim());
    if (
      !Number.isInteger(parsedLimit) ||
      parsedLimit < MIN_TURN_LIMIT_SECS ||
      parsedLimit > MAX_TURN_LIMIT_SECS
    ) {
      throw new Error(
        `Config validation error: GAME_TURN_TIME_LIMIT_SECS must be an integer between ${MIN_TURN_LIMIT_SECS} and ${MAX_TURN_LIMIT_SECS}.`,
      );
    }
    turnTimeLimitSecs = parsedLimit;
  }

  let port = DEFAULT_PORT;
  if (env.PORT !== undefined && env.PORT.trim() !== '') {
    const parsedPort = Number(env.PORT.trim());
    if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
      throw new Error('Config validation error: PORT must be a valid TCP port (1-65535).');
    }
    port = parsedPort;
  }

  return Object.freeze({
    nodeEnv,
    port,
    jwtSecret,
    jwtRefreshSecret,
    corsOrigins,
    turnTimeLimitSecs,
    databaseUrl,
  });
}
