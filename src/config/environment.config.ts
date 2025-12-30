import * as Joi from 'joi';

/**
 * Environment type definitions
 */
export type Environment = 'local' | 'staging' | 'production';

/**
 * Get the current environment
 * Defaults to 'local' if NODE_ENV is not set
 */
export function getEnvironment(): Environment {
  const env = process.env.NODE_ENV;
  if (env === 'production' || env === 'staging' || env === 'local') {
    return env;
  }
  return 'local';
}

/**
 * Get the appropriate .env file path based on environment
 */
export function getEnvFilePath(): string {
  const environment = getEnvironment();

  const envFilePaths: Record<Environment, string> = {
    local: '.env.local',
    staging: '.env.staging',
    production: '.env.production',
  };

  return envFilePaths[environment];
}

/**
 * Check if running in production environment
 */
export function isProduction(): boolean {
  return getEnvironment() === 'production';
}

/**
 * Check if running in staging environment
 */
export function isStaging(): boolean {
  return getEnvironment() === 'staging';
}

/**
 * Check if running in local development environment
 */
export function isLocal(): boolean {
  return getEnvironment() === 'local';
}

/**
 * Environment variable validation schema
 * Validates required variables based on environment
 */
export function getValidationSchema(): Joi.ObjectSchema {
  const baseSchema = {
    NODE_ENV: Joi.string()
      .valid('local', 'staging', 'production')
      .default('local'),
    PORT: Joi.number().default(8080),
  };

  // Local development - most variables are optional (have defaults)
  const localSchema = Joi.object({
    ...baseSchema,
    MONGODB_URI: Joi.string().uri({ scheme: ['mongodb', 'mongodb+srv'] }).optional(),
    REDIS_URL: Joi.string().uri({ scheme: ['redis', 'rediss'] }).optional(),
    JWT_ACCESS_SECRET: Joi.string().min(32).optional(),
    JWT_REFRESH_SECRET: Joi.string().min(32).optional(),
    JWT_ACCESS_EXPIRATION: Joi.string().default('30m'),
    JWT_REFRESH_EXPIRATION: Joi.string().default('7d'),
    OPENAI_API_KEY: Joi.string().optional(),
    LIVEKIT_URL: Joi.string().uri().optional(),
    LIVEKIT_API_KEY: Joi.string().optional(),
    LIVEKIT_API_SECRET: Joi.string().optional(),
    TRANSCRIPTION_SERVICE_URL: Joi.string().uri().optional(),
    TRANSCRIPTION_SERVICE_API_KEY: Joi.string().optional(),
    TRANSCRIPTION_JWT_SECRET: Joi.string().optional(),
    TRANSCRIPTION_JWT_ISSUER: Joi.string().optional(),
    TRANSCRIPTION_JWT_AUDIENCE: Joi.string().optional(),
  });

  // Staging - all required except monitoring configs
  const stagingSchema = Joi.object({
    ...baseSchema,
    GCP_PROJECT_ID: Joi.string().required(),
    MONGODB_URI: Joi.string().uri({ scheme: ['mongodb', 'mongodb+srv'] }).required(),
    REDIS_URL: Joi.string().uri({ scheme: ['redis', 'rediss'] }).required(),
    JWT_ACCESS_SECRET: Joi.string().min(64).required(),
    JWT_REFRESH_SECRET: Joi.string().min(64).required(),
    JWT_ACCESS_EXPIRATION: Joi.string().default('30m'),
    JWT_REFRESH_EXPIRATION: Joi.string().default('7d'),
    OPENAI_API_KEY: Joi.string().required(),
    LIVEKIT_URL: Joi.string().uri().required(),
    LIVEKIT_API_KEY: Joi.string().required(),
    LIVEKIT_API_SECRET: Joi.string().required(),
    TRANSCRIPTION_SERVICE_URL: Joi.string().uri().required(),
    TRANSCRIPTION_SERVICE_API_KEY: Joi.string().min(32).required(),
    TRANSCRIPTION_JWT_SECRET: Joi.string().required(),
    TRANSCRIPTION_JWT_ISSUER: Joi.string().required(),
    TRANSCRIPTION_JWT_AUDIENCE: Joi.string().required(),
    ALLOWED_ORIGINS: Joi.string().optional(),
  });

  // Production - all required including monitoring
  const productionSchema = stagingSchema.keys({
    GCP_PROJECT_ID: Joi.string().required(),
    ALLOWED_ORIGINS: Joi.string().required(),
  });

  const environment = getEnvironment();

  switch (environment) {
    case 'production':
      return productionSchema;
    case 'staging':
      return stagingSchema;
    case 'local':
    default:
      return localSchema;
  }
}

/**
 * Validate environment variables
 * Throws an error if validation fails
 */
export function validateEnvironment(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const schema = getValidationSchema();
  const result = schema.validate(config, {
    abortEarly: false,
    allowUnknown: true,
  });

  if (result.error) {
    const missingVars = result.error.details
      .map((detail) => detail.message)
      .join(', ');
    throw new Error(
      `Environment validation failed for ${getEnvironment()} environment: ${missingVars}`,
    );
  }

  return result.value as Record<string, unknown>;
}

/**
 * Get CORS allowed origins based on environment
 */
export function getAllowedOrigins(): string[] {
  const environment = getEnvironment();

  // Check for custom ALLOWED_ORIGINS env var first
  if (process.env.ALLOWED_ORIGINS) {
    return process.env.ALLOWED_ORIGINS.split(',').map((origin) =>
      origin.trim(),
    );
  }

  // Default origins per environment
  // Note: Mobile apps bypass CORS, but we still restrict browser access for security.
  // For mobile-only API, we use an empty array to block all browser-based requests.
  // Mobile apps will work fine as they don't send Origin headers that trigger CORS.
  const defaultOrigins: Record<Environment, string[]> = {
    local: [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:4200',
    ],
    staging: [], // Block browser requests - mobile app only, add web domains when needed
    production: [], // Block browser requests - mobile app only, add web domains when needed
  };

  return defaultOrigins[environment];
}
