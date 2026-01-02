import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as bodyParser from 'body-parser';
import helmet from 'helmet';
import { getAllowedOrigins, getEnvironment } from './config/environment.config';
import { GcpSecretsConfig } from './config/gcp-secrets.config';

async function bootstrap() {
  // Initialize GCP Secret Manager for production/staging
  GcpSecretsConfig.initialize();

  const app = await NestFactory.create(AppModule);

  // Enable graceful shutdown hooks
  // This allows NestJS to properly close connections on SIGTERM/SIGINT
  app.enableShutdownHooks();

  // Get current environment
  const environment = getEnvironment();
  console.log(`Starting AI Interview Backend in ${environment} mode`);

  // Security headers with Helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for Swagger
          scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts for Swagger
          scriptSrcAttr: ["'unsafe-inline'"], // Allow inline script attributes for Swagger
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
      frameguard: {
        action: 'deny', // Prevent clickjacking
      },
    }),
  );

  // Increase body size limit for large interview transcripts
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

  // Global API prefix
  app.setGlobalPrefix('api');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Enable CORS with environment-specific origins
  const allowedOrigins = getAllowedOrigins();
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });
  console.log(`CORS enabled for origins: ${allowedOrigins.join(', ')}`);

  app.useGlobalFilters(new AllExceptionsFilter());

  // Swagger/OpenAPI Documentation Setup
  const config = new DocumentBuilder()
    .setTitle('AI Interview Backend API')
    .setDescription(
      'REST API for AI-powered case interview analysis with real-time transcription and MBB-aligned evaluation',
    )
    .setVersion('1.0')
    .addTag('auth', 'Authentication endpoints (signup, login, refresh tokens)')
    .addTag('interviews', 'Market sizing interview analysis endpoints')
    .addTag('livekit', 'LiveKit room and token management')
    .addTag('health', 'Health check endpoints')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT access token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'AI Interview API Docs',
    customfavIcon: 'https://nestjs.com/img/logo-small.svg',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  // Use port 8080 for Cloud Run compatibility (default Cloud Run port)
  const port = process.env.PORT ?? 8080;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Application is running on: http://0.0.0.0:${port}`);
  console.log(`📚 API Documentation: http://0.0.0.0:${port}/api/docs`);
}

void bootstrap();
