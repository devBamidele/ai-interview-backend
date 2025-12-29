import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { LoggerService } from '../common/logger/logger.service';

export class GcpSecretsConfig {
  private static client: SecretManagerServiceClient;
  private static cache: Map<string, { value: string; timestamp: number }> =
    new Map();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private static logger: LoggerService;

  /**
   * Initialize the Secret Manager client
   * Only creates client in production/staging environments
   */
  static initialize() {
    if (
      process.env.NODE_ENV === 'production' ||
      process.env.NODE_ENV === 'staging'
    ) {
      this.client = new SecretManagerServiceClient();
      this.logger = new LoggerService();
      this.logger.setContext('GcpSecretsConfig');
      this.logger.log(
        `GCP Secret Manager initialized for ${process.env.NODE_ENV} environment`,
      );
    }
  }

  /**
   * Retrieve a secret from GCP Secret Manager
   * Falls back to environment variables for local development
   * @param secretName - Name of the secret (e.g., 'jwt-access-secret')
   * @param fallbackEnvVar - Environment variable name to use as fallback
   */
  static async getSecret(
    secretName: string,
    fallbackEnvVar?: string,
  ): Promise<string> {
    // For local development, use environment variables
    if (process.env.NODE_ENV === 'local' || !this.client) {
      const envValue = process.env[fallbackEnvVar || secretName];
      if (!envValue) {
        throw new Error(
          `Environment variable ${fallbackEnvVar || secretName} not found`,
        );
      }
      return envValue;
    }

    // Check cache first
    const cached = this.cache.get(secretName);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.value;
    }

    try {
      const projectId = process.env.GCP_PROJECT_ID;
      if (!projectId) {
        throw new Error('GCP_PROJECT_ID environment variable not set');
      }

      const environment = process.env.NODE_ENV;
      const fullSecretName = `ai-interview-${secretName}-${environment}`;
      const secretPath = `projects/${projectId}/secrets/${fullSecretName}/versions/latest`;

      this.logger?.log(`Fetching secret: ${fullSecretName}`);

      const [version] = await this.client.accessSecretVersion({
        name: secretPath,
      });

      const secretValue = version.payload?.data?.toString();
      if (!secretValue) {
        throw new Error(`Secret ${fullSecretName} has no value`);
      }

      // Cache the secret
      this.cache.set(secretName, {
        value: secretValue,
        timestamp: Date.now(),
      });

      return secretValue;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger?.error(
        `Failed to fetch secret ${secretName}: ${errorMessage}`,
      );

      // Fallback to environment variable if secret fetch fails
      if (fallbackEnvVar && process.env[fallbackEnvVar]) {
        this.logger?.warn(
          `Using fallback environment variable ${fallbackEnvVar}`,
        );
        return process.env[fallbackEnvVar];
      }

      throw error;
    }
  }

  /**
   * Clear the secrets cache
   * Useful for testing or forcing refresh
   */
  static clearCache() {
    this.cache.clear();
    this.logger?.log('Secret cache cleared');
  }
}
