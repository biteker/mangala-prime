process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:test_password@localhost:5432/mangala_test_db';
process.env.JWT_SECRET =
  process.env.JWT_SECRET ||
  'test_jwt_access_secret_minimum_32_characters_long_0001';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ||
  'test_jwt_refresh_secret_minimum_32_characters_long_0002';
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
process.env.GAME_TURN_TIME_LIMIT_SECS =
  process.env.GAME_TURN_TIME_LIMIT_SECS || '59';
process.env.PORT = process.env.PORT || '3000';
