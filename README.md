# AI Interview Backend

An AI-powered case interview coaching platform backend built with NestJS. This backend processes market sizing case interviews, analyzes speech patterns and problem-solving approach, and provides AI-driven feedback using OpenAI GPT based on MBB (McKinsey, BCG, Bain) evaluation criteria.

## Overview

This platform receives interview session data from LiveKit-based voice interviews, processes transcripts and speech analytics, and evaluates market sizing case performance across five key dimensions used by top consulting firms. The system supports both authenticated users and anonymous sessions with JWT-based authentication and Redis-powered refresh token management.

## Key Features

### Core Functionality
- **LiveKit Integration**: Generates dual tokens (LiveKit + transcription service) for voice-based interviews
- **Speech Analytics Processing**: Processes detailed speech metrics including pace (WPM), filler words, pauses, and word-level confidence scores
- **AI-Powered Evaluation**: Uses OpenAI GPT to analyze market sizing case performance and provide detailed coaching feedback
- **MBB-Aligned Assessment**: Evaluates five key dimensions - structured thinking, business judgment, quantitative skills, communication, and sanity checks
- **Case Question Management**: Database of market sizing questions with difficulty levels, model answer ranges, and expert approaches
- **Async Processing**: Background AI analysis to prevent blocking HTTP requests
- **Interview History**: Stores complete interview records including transcripts, speech analytics, and AI evaluations

### Authentication & User Management
- **Dual User System**: Support for both authenticated users (email/password) and anonymous users
- **JWT Authentication**: Secure access token and refresh token system with Redis-based session management
- **Request-Scoped Context**: Efficient user context injection using `AuthContextService` for all authenticated requests
- **Account Upgrade**: Anonymous users can upgrade to authenticated accounts while preserving interview history
- **Automatic Session Management**: 2-hour LiveKit sessions with automatic room cleanup

### Security
- **Service-to-Service Authentication**: Transcription service guard validates incoming analysis requests with API keys
- **Token-Based Authorization**: Separate JWT tokens for LiveKit and transcription service access
- **Redis Token Storage**: Secure refresh token management with automatic expiration
- **Password Security**: Bcrypt hashing with 12 salt rounds

## Tech Stack

- **NestJS 11.0.1**: Backend framework
- **TypeScript 5.7.3**: Type-safe development
- **MongoDB 8.19.0** + **Mongoose 8.19.0**: Database and ODM
- **Redis 5.10.0** + **IORedis 5.8.2**: Session management and caching
- **JWT**: Authentication and authorization (@nestjs/jwt 11.0.2, passport-jwt 4.0.1)
- **LiveKit SDK 2.13.2**: Real-time audio communication and token generation
- **OpenAI SDK 6.1.0**: AI analysis integration
- **Deepgram SDK 4.11.2**: Speech-to-text transcription metadata
- **Swagger/OpenAPI**: API documentation (@nestjs/swagger 11.2.3)
- **Bcrypt 6.0.0**: Password hashing
- **class-validator** & **class-transformer**: Input validation and transformation

## Architecture

```
AppModule
├── ConfigModule (Environment configuration)
├── MongooseModule (Database connection)
├── LoggerModule (Custom logging)
├── RedisModule (Session management)
├── AuthModule (JWT authentication & user management)
│   ├── AuthService (Login, signup, token management)
│   ├── AuthContextService (Request-scoped user context)
│   ├── JwtAuthGuard (Global authentication guard)
│   └── TranscriptionServiceGuard (Service-to-service authentication)
├── LivekitModule (Token generation for rooms & transcription)
├── InterviewsModule (Interview CRUD & AI processing)
└── AIModule (OpenAI integration)
```

## API Endpoints

### Authentication
- `POST /auth/signup` - Create new authenticated user account
  - Body: `{ email, password, name }`
  - Returns: `{ accessToken, refreshToken, user }`

- `POST /auth/login` - Login with email/password
  - Body: `{ email, password }`
  - Returns: `{ accessToken, refreshToken, user }`

- `POST /auth/anonymous` - Create anonymous user session
  - Body: `{ participantName }`
  - Returns: `{ accessToken, refreshToken, user }`

- `POST /auth/refresh` - Refresh access token
  - Body: `{ refreshToken }`
  - Returns: `{ accessToken }`

- `POST /auth/logout` - Invalidate refresh token
  - Headers: `Authorization: Bearer <accessToken>`
  - Body: `{ refreshToken }`

- `POST /auth/upgrade` - Upgrade anonymous account to authenticated
  - Headers: `Authorization: Bearer <accessToken>`
  - Body: `{ email, password, name }`
  - Returns: `{ accessToken, refreshToken, user }`

- `GET /auth/me` - Get current user profile
  - Headers: `Authorization: Bearer <accessToken>`
  - Returns: User profile with interview statistics

### LiveKit
- `POST /livekit/token` - Generate access tokens for LiveKit room and transcription service
  - Headers: `Authorization: Bearer <accessToken>`
  - Body: `{ participantName, interviewType? }`
  - Returns: `{ livekitToken, transcriptionToken, url, roomName, participantIdentity }`

### Interviews
- `POST /interviews/analyze` - Submit market sizing case interview for AI analysis (transcription service only)
  - Headers: `Authorization: Bearer <TRANSCRIPTION_SERVICE_API_KEY>`
  - Body:
    ```json
    {
      "roomName": "string",
      "participantIdentity": "string",
      "caseQuestion": "string",
      "difficulty": "easy" | "medium" | "hard",
      "candidateAnswer": "string (optional)",
      "sessionData": {
        "transcript": "string",
        "duration": "number",
        "totalWords": "number",
        "averagePace": "number",
        "paceTimeline": [...],
        "fillers": [...],
        "pauses": [...],
        "words": [...],
        "transcriptSegments": [...]
      }
    }
    ```
  - Returns: `{ interviewId, status: "processing", message }`

- `GET /interviews/:interviewId` - Get detailed interview results with AI evaluation
  - Headers: `Authorization: Bearer <accessToken>`
  - Returns: Complete interview record with AI analysis

- `GET /interviews/summary` - Get current user's interview history summary
  - Headers: `Authorization: Bearer <accessToken>`
  - Returns: List of interview summaries with scores and timestamps

## Environment Variables

Create a `development.env` file with:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/ai-interview

# Redis (Session Management)
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Authentication (User Sessions)
JWT_ACCESS_SECRET=your-super-secret-access-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
JWT_ACCESS_EXPIRATION=30m
JWT_REFRESH_EXPIRATION=7d

# Transcription Service JWT (MUST be identical in transcription service)
TRANSCRIPTION_JWT_SECRET=your-transcription-secret-min-32-chars-change-in-production
TRANSCRIPTION_JWT_ISSUER=interview-backend
TRANSCRIPTION_JWT_AUDIENCE=transcription-service

# Transcription Service Configuration
TRANSCRIPTION_SERVICE_URL=http://localhost:3001
TRANSCRIPTION_SERVICE_API_KEY=your-service-api-key-change-in-production

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# LiveKit
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
LIVEKIT_URL=wss://your-livekit-url

# Server
PORT=3000
```

### Security Notes
- **JWT_ACCESS_SECRET** and **JWT_REFRESH_SECRET**: Must be at least 32 characters, different from each other
- **TRANSCRIPTION_JWT_SECRET**: Must be identical in both backend and transcription service (32+ chars)
- **TRANSCRIPTION_SERVICE_API_KEY**: Shared secret for service-to-service authentication
- All secrets should be generated using cryptographically secure random strings
- Never commit `.env` files to version control

## Installation

```bash
npm install
```

## Database Setup

1. Ensure MongoDB is running locally or configure `MONGODB_URI` to point to your MongoDB instance

2. Seed the database with market sizing case questions:

```bash
npm run seed:cases
```

## Running the Application

```bash
# Development (with hot reload)
npm run start:dev

# Production build
npm run build
npm run start:prod

# Debug mode
npm run start:debug
```

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Authentication Flow

### Authenticated Users
```
1. User → POST /auth/signup or /auth/login
   Returns: { accessToken, refreshToken, user }

2. Client stores tokens securely
   - accessToken: Include in Authorization header (expires in 30m)
   - refreshToken: Store securely for token refresh (expires in 7d)

3. Client → POST /livekit/token (with accessToken)
   Returns: { livekitToken, transcriptionToken, roomName, ... }

4. Client uses:
   - livekitToken: Connect to LiveKit for audio
   - transcriptionToken: Connect to transcription service WebSocket

5. When accessToken expires:
   Client → POST /auth/refresh (with refreshToken)
   Returns: { accessToken }
```

### Anonymous Users
```
1. User → POST /auth/anonymous
   Body: { participantName: "Guest User" }
   Returns: { accessToken, refreshToken, user }

2. Interview flow same as authenticated users

3. Optional upgrade:
   User → POST /auth/upgrade (with accessToken)
   Body: { email, password, name }
   Returns: { accessToken, refreshToken, user }
   - Preserves all interview history
   - User can now login with email/password
```

## AI Evaluation Framework

The backend analyzes market sizing case interviews across 5 MBB-aligned dimensions:

1. **Structured Problem-Solving** (30%): Framework articulation, MECE segmentation, logical approach
2. **Business Judgment & Assumptions** (25%): Realistic assumptions with clear justification
3. **Quantitative Skills** (20%): Mathematical accuracy, step-by-step calculations, numerical reasoning
4. **Communication** (15%): Speech pace, clarity, minimal filler words, confidence
5. **Sanity Check** (10%): Answer validation, order of magnitude checks, reality testing

Each dimension receives:
- **Score**: 1-5 (Insufficient → Outstanding)
- **Strengths**: What the candidate did well
- **Areas for Improvement**: Specific feedback on weaknesses
- **Actionable Recommendations**: Concrete steps to improve

The system calculates a weighted overall score and provides comprehensive feedback to help candidates improve their consulting interview performance.

## System Architecture

This backend is part of a larger interview coaching system:

```
┌─────────────────┐
│  Flutter App    │
│  (Frontend)     │
└────────┬────────┘
         │
         │ 1. Auth: POST /auth/login or /auth/anonymous
         │ 2. Tokens: POST /livekit/token
         │
         ▼
┌─────────────────────────────────────┐
│  NestJS Backend (This Service)      │
│  - JWT Authentication               │
│  - Redis Session Management         │
│  - LiveKit Token Generation         │
│  - Transcription Token Generation   │
│  - Interview Analysis & Storage     │
│  - AI Evaluation (OpenAI)           │
└────────┬──────────────────────┬─────┘
         │                      │
         │ 3. LiveKit Token     │ 4. Transcription Token
         ▼                      ▼
┌─────────────────┐    ┌──────────────────────────┐
│  LiveKit Cloud  │    │  Transcription Service   │
│  - Audio/Video  │    │  - Real-time STT         │
│  - WebRTC       │    │  - Deepgram Integration  │
└─────────────────┘    │  - Speech Analytics      │
                       └──────────┬───────────────┘
                                  │
                                  │ 5. POST /interviews/analyze
                                  │    (with service API key)
                                  ▼
                       ┌──────────────────────────┐
                       │  NestJS Backend          │
                       │  - Validates API key     │
                       │  - Stores transcript     │
                       │  - AI analysis (async)   │
                       │  - Returns interviewId   │
                       └──────────────────────────┘
```

### Key Integration Points

1. **Frontend ↔ Backend**: JWT authentication, token generation
2. **Frontend ↔ LiveKit**: Real-time audio using livekitToken
3. **Frontend ↔ Transcription Service**: Real-time transcription using transcriptionToken
4. **Transcription Service ↔ Backend**: Analysis submission with service API key
5. **Backend ↔ OpenAI**: Async AI evaluation of interviews

## API Documentation

When running in development mode, visit:
- **Swagger UI**: `http://localhost:3000/api/docs`
- **OpenAPI JSON**: `http://localhost:3000/api/docs-json`

The API documentation includes:
- All endpoint definitions
- Request/response schemas
- Authentication requirements
- Example payloads

## User Data Model

### Authenticated User
```typescript
{
  _id: ObjectId,
  email: "user@example.com",
  name: "John Doe",
  userType: "authenticated",
  isActive: true,
  lastLoginAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Anonymous User
```typescript
{
  _id: ObjectId,
  name: "Guest User",
  participantIdentity: "anon-xyz123",
  userType: "anonymous",
  isActive: true,
  createdAt: Date,
  updatedAt: Date
}
```

## Interview Data Model

```typescript
{
  _id: ObjectId,
  userId: ObjectId,
  roomName: "interview-user-abc-1234567890",
  participantIdentity: "user-xyz",
  transcript: "Full interview transcript...",
  duration: 480, // seconds
  totalWords: 856,
  averagePace: 107, // WPM
  paceTimeline: [...],
  fillers: [...],
  pauses: [...],
  words: [...],
  transcriptSegments: [...],
  caseQuestion: "Estimate the market size...",
  difficulty: "medium",
  candidateAnswer: "100 million",
  status: "completed", // processing | completed | failed
  aiAnalysis: {
    overallScore: 3.8,
    structuredThinking: { score: 4, ... },
    businessJudgment: { score: 3, ... },
    quantitativeSkills: { score: 4, ... },
    communication: { score: 4, ... },
    sanityCheck: { score: 4, ... },
    summary: "...",
    keyTakeaways: [...]
  },
  createdAt: Date,
  updatedAt: Date
}
```

## Development

### Project Structure
```
src/
├── auth/                    # Authentication module
│   ├── auth.service.ts      # Login, signup, token management
│   ├── auth.controller.ts   # Auth endpoints
│   ├── auth-context.service.ts  # Request-scoped user context
│   ├── guards/
│   │   ├── jwt-auth.guard.ts    # Global JWT validation
│   │   └── transcription-service.guard.ts  # Service auth
│   └── strategies/
│       └── jwt.strategy.ts      # Passport JWT strategy
├── livekit/                 # LiveKit integration
│   ├── livekit.service.ts   # Token generation, room management
│   └── livekit.controller.ts
├── interviews/              # Interview management
│   ├── interviews.service.ts  # CRUD, AI processing
│   └── interviews.controller.ts
├── ai/                      # OpenAI integration
│   └── ai.service.ts        # GPT analysis
├── redis/                   # Redis session management
│   └── redis.service.ts
├── schemas/                 # Mongoose schemas
│   ├── user.schema.ts
│   └── interview.schema.ts
├── common/                  # Shared utilities
│   ├── dto/                 # Data transfer objects
│   ├── interfaces/          # TypeScript interfaces
│   ├── logger/              # Custom logger
│   └── utils/               # Helper functions
└── main.ts                  # Application entry point
```

### Adding New Features

1. Create module: `nest g module feature-name`
2. Create service: `nest g service feature-name`
3. Create controller: `nest g controller feature-name`
4. Add DTOs in `src/common/dto/`
5. Add interfaces in `src/common/interfaces/`
6. Update Swagger documentation with decorators

## Production Deployment Checklist

- [ ] Generate secure random strings for all JWT secrets (min 32 chars)
- [ ] Configure MongoDB with authentication
- [ ] Set up Redis with password protection
- [ ] Use environment-specific `.env` files (development.env, production.env)
- [ ] Enable HTTPS/TLS for all endpoints
- [ ] Configure CORS for your frontend domain
- [ ] Set up logging and monitoring
- [ ] Configure rate limiting
- [ ] Set up backup strategy for MongoDB
- [ ] Document API with Swagger
- [ ] Set up CI/CD pipeline
- [ ] Configure health checks
- [ ] Use process manager (PM2, Docker, etc.)

## License

UNLICENSED
