# Backend Integration Guide - JWT Authentication for Transcription Service

## Overview

This document outlines the changes required in your Nest.js backend to support JWT-authenticated WebSocket connections to the transcription service.

**Purpose**: Generate and issue JWT tokens that authorize users to connect to specific LiveKit rooms for transcription.

---

## Required Changes Summary

1. ✅ Add JWT token generation endpoint
2. ✅ Configure shared JWT_SECRET environment variable
3. ✅ Add service-to-service authentication for incoming transcription data
4. ✅ Update existing LiveKit token endpoint (if applicable)

---

## 1. Environment Variables

### Add to Backend `.env`

```env
# JWT Configuration for Transcription Service
# CRITICAL: This MUST be the SAME value as in transcription-service/.env
JWT_SECRET=your-super-secret-key-min-32-chars-change-this-in-production

# OPTIONAL: JWT issuer and audience (for enhanced validation)
JWT_ISSUER=interview-backend
JWT_AUDIENCE=transcription-service

# Transcription Service URL
TRANSCRIPTION_SERVICE_URL=http://localhost:3001  # Update for production
```

**Security Requirements**:
- `JWT_SECRET` must be **at least 32 characters**
- Must be **identical** in both backend and transcription service
- Never commit to version control (use `.env` files)
- Use a strong random string in production (e.g., generated with `openssl rand -base64 32`)

---

## 2. Install Dependencies

```bash
npm install @nestjs/jwt
```

If not already installed, you'll also need:
```bash
npm install @nestjs/passport passport passport-jwt
```

---

## 3. JWT Module Configuration

### Create or Update `src/auth/auth.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '2h',  // Token valid for 2 hours (max interview duration)
          issuer: configService.get<string>('JWT_ISSUER') || 'interview-backend',
          audience: configService.get<string>('JWT_AUDIENCE') || 'transcription-service',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  exports: [JwtModule],
})
export class AuthModule {}
```

---

## 4. Create Transcription Token Generation Endpoint

### Option A: New Standalone Endpoint

**File**: `src/transcription/transcription.controller.ts`

```typescript
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';  // Your existing auth guard
import { User } from '../decorators/user.decorator';  // Your user decorator

interface TranscriptionTokenDto {
  roomName: string;
  participantIdentity: string;
}

interface TranscriptionTokenResponse {
  transcriptionToken: string;
  roomName: string;
  participantIdentity: string;
  expiresIn: number;
}

@Controller('api/transcription')
export class TranscriptionController {
  constructor(private jwtService: JwtService) {}

  @Post('token')
  @UseGuards(AuthGuard('jwt'))  // Your existing JWT auth guard
  async generateTranscriptionToken(
    @User() user,
    @Body() dto: TranscriptionTokenDto
  ): Promise<TranscriptionTokenResponse> {

    // Generate JWT for transcription service
    const transcriptionToken = this.jwtService.sign({
      userId: user.id,
      roomName: dto.roomName,
      participantIdentity: dto.participantIdentity,
    });

    return {
      transcriptionToken,
      roomName: dto.roomName,
      participantIdentity: dto.participantIdentity,
      expiresIn: 7200, // 2 hours in seconds
    };
  }
}
```

---

### Option B: Combined with Existing LiveKit Token Endpoint

**File**: `src/livekit/livekit.controller.ts`

```typescript
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AccessToken } from 'livekit-server-sdk';
import { AuthGuard } from '@nestjs/passport';
import { User } from '../decorators/user.decorator';

interface CreateInterviewTokenDto {
  interviewType?: string;
  // Add other fields as needed
}

interface InterviewTokenResponse {
  livekitToken: string;
  transcriptionToken: string;  // NEW
  roomName: string;
  participantIdentity: string;
}

@Controller('api/livekit')
export class LiveKitController {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService
  ) {}

  @Post('token')
  @UseGuards(AuthGuard('jwt'))
  async createInterviewToken(
    @User() user,
    @Body() dto: CreateInterviewTokenDto
  ): Promise<InterviewTokenResponse> {

    // 1. Generate unique identifiers
    const roomName = `interview-${user.id}-${Date.now()}`;
    const participantIdentity = `user-${user.id}`;

    // 2. Generate LiveKit token (existing logic)
    const livekitToken = new AccessToken(
      this.configService.get('LIVEKIT_API_KEY'),
      this.configService.get('LIVEKIT_API_SECRET'),
      {
        identity: participantIdentity,
        name: user.name || user.email,
      }
    );

    livekitToken.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });

    // 3. Generate Transcription JWT (NEW)
    const transcriptionToken = this.jwtService.sign({
      userId: user.id,
      roomName: roomName,
      participantIdentity: participantIdentity,
    });

    // 4. Return both tokens
    return {
      livekitToken: await livekitToken.toJwt(),
      transcriptionToken,  // NEW
      roomName,
      participantIdentity,
    };
  }
}
```

---

## 5. Service-to-Service Authentication (Optional but Recommended)

### Add API Key Validation for Incoming Transcription Data

When the transcription service sends analysis data to `POST /api/interviews/analyze`, you should validate it's coming from your transcription service.

#### Add Environment Variable

```env
# API key for transcription service
TRANSCRIPTION_SERVICE_API_KEY=your-service-api-key-change-this
```

#### Create Guard

**File**: `src/guards/transcription-service.guard.ts`

```typescript
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TranscriptionServiceGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Missing authorization header');
    }

    const expectedKey = this.configService.get<string>('TRANSCRIPTION_SERVICE_API_KEY');
    const providedKey = authHeader.replace('Bearer ', '');

    if (providedKey !== expectedKey) {
      throw new UnauthorizedException('Invalid service API key');
    }

    return true;
  }
}
```

#### Use in Interview Controller

**File**: `src/interviews/interviews.controller.ts`

```typescript
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { TranscriptionServiceGuard } from '../guards/transcription-service.guard';

interface AnalyzeInterviewDto {
  roomName: string;
  participantIdentity: string;
  sessionData: {
    transcript: string;
    duration: number;
    totalWords: number;
    averagePace: number;
    paceTimeline: any[];
    fillers: any[];
    pauses: any[];
    words: any[];
    transcriptSegments: any[];
  };
  caseQuestion?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  candidateAnswer?: string;
}

@Controller('api/interviews')
export class InterviewsController {
  constructor(private interviewsService: InterviewsService) {}

  @Post('analyze')
  @UseGuards(TranscriptionServiceGuard)  // Validate service API key
  async analyzeInterview(@Body() dto: AnalyzeInterviewDto) {
    // 1. Create interview record in MongoDB
    const interview = await this.interviewsService.create({
      roomName: dto.roomName,
      participantIdentity: dto.participantIdentity,
      transcript: dto.sessionData.transcript,
      duration: dto.sessionData.duration,
      totalWords: dto.sessionData.totalWords,
      averagePace: dto.sessionData.averagePace,
      paceTimeline: dto.sessionData.paceTimeline,
      fillers: dto.sessionData.fillers,
      pauses: dto.sessionData.pauses,
      words: dto.sessionData.words,
      caseQuestion: dto.caseQuestion,
      difficulty: dto.difficulty,
      candidateAnswer: dto.candidateAnswer,
      status: 'processing',
    });

    // 2. Send to OpenAI for analysis (async)
    this.interviewsService.analyzeWithOpenAI(interview.id);

    // 3. Return interview ID
    return { interviewId: interview.id };
  }
}
```

---

## 6. Update Transcription Service Configuration

**In your transcription service `.env`**, add the service API key:

```env
# Backend API authentication
BACKEND_API_KEY=your-service-api-key-change-this  # MUST match backend's TRANSCRIPTION_SERVICE_API_KEY
```

**Update transcription service code** to send API key in headers:

**File**: `transcription-service/src/services/TranscriptionSession.ts` (line 305)

```typescript
private async sendToBackend(summary: SessionSummary): Promise<string> {
  const backendUrl = `${config.backend.url}${config.backend.analyzeEndpoint}`;

  try {
    const response = await axios.post(backendUrl, {
      roomName: this.roomName,
      participantIdentity: this.participantIdentity,
      sessionData: summary,
      caseQuestion: this.caseQuestion,
      difficulty: this.difficulty,
      candidateAnswer: candidateAnswer,
    }, {
      headers: {
        'Authorization': `Bearer ${config.backend.apiKey}`,  // NEW
        'Content-Type': 'application/json',
      },
    });

    return response.data.interviewId;
  } catch (error) {
    console.error("Failed to send summary to backend:", error);
    throw error;
  }
}
```

**Update config** to include API key:

**File**: `transcription-service/src/config/index.ts`

```typescript
backend: {
  url: process.env.BACKEND_URL || "http://localhost:3000",
  analyzeEndpoint: "/api/interviews/analyze",
  apiKey: process.env.BACKEND_API_KEY || "",  // NEW
},
```

**Validate API key**:

```typescript
const required = [
  "LIVEKIT_URL",
  "LIVEKIT_API_KEY",
  "LIVEKIT_API_SECRET",
  "DEEPGRAM_API_KEY",
  "JWT_SECRET",
  "BACKEND_API_KEY",  // NEW
];
```

---

## 7. Testing the Integration

### Step 1: Test Token Generation

```bash
# Authenticate as user and get access token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}' \
  > auth.json

# Extract access token
ACCESS_TOKEN=$(cat auth.json | jq -r '.accessToken')

# Request transcription token
curl -X POST http://localhost:3000/api/livekit/token \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"interviewType": "behavioral"}'

# Response should include:
# {
#   "livekitToken": "eyJhbGc...",
#   "transcriptionToken": "eyJhbGc...",
#   "roomName": "interview-123-1735123456",
#   "participantIdentity": "user-123"
# }
```

### Step 2: Verify JWT Structure

Use [jwt.io](https://jwt.io) to decode the `transcriptionToken`. It should contain:

```json
{
  "userId": "user-123",
  "roomName": "interview-123-1735123456",
  "participantIdentity": "user-123",
  "iat": 1735123456,
  "exp": 1735130656,
  "iss": "interview-backend",
  "aud": "transcription-service"
}
```

### Step 3: Test WebSocket Connection

```typescript
// In your Flutter app or test client
const response = await fetch('http://localhost:3000/api/livekit/token', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${userAccessToken}`,
    'Content-Type': 'application/json'
  }
});

const { transcriptionToken, roomName, participantIdentity } = await response.json();

// Connect to transcription service
const ws = new WebSocket(`ws://localhost:3001?token=${transcriptionToken}`);

ws.onopen = () => {
  console.log('Connected to transcription service');
  ws.send(JSON.stringify({
    action: 'start',
    roomName: roomName,
    participantIdentity: participantIdentity
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};
```

---

## 8. Common Issues and Solutions

### Issue 1: "Invalid authentication token"

**Cause**: JWT_SECRET mismatch between backend and transcription service

**Solution**:
```bash
# Verify secrets match
# Backend:
echo $JWT_SECRET  # or cat .env | grep JWT_SECRET

# Transcription service:
cd ../transcription-service
echo $JWT_SECRET  # Should be IDENTICAL
```

### Issue 2: "Token expired"

**Cause**: Token expiration is too short or system clocks are out of sync

**Solution**:
- Increase `expiresIn` to `'2h'` or longer
- Ensure both servers have synchronized clocks (use NTP)

### Issue 3: "Unauthorized: roomName does not match token"

**Cause**: Flutter is sending different roomName than what's in the JWT

**Solution**:
- Ensure Flutter uses the **exact** `roomName` returned from token endpoint
- Don't generate roomName on Flutter side - always use backend's value

### Issue 4: Backend receives analysis but can't verify source

**Cause**: Missing service-to-service authentication

**Solution**:
- Implement `TranscriptionServiceGuard` (see Section 5)
- Add `BACKEND_API_KEY` to both services

---

## 9. Security Checklist

Before deploying to production:

- [ ] `JWT_SECRET` is at least 32 characters
- [ ] `JWT_SECRET` is identical in both backend and transcription service
- [ ] `JWT_SECRET` is not committed to version control
- [ ] Token expiration is set to reasonable duration (2 hours recommended)
- [ ] Service-to-service API key authentication is enabled
- [ ] Backend validates incoming analysis requests are from transcription service
- [ ] All secrets are stored in environment variables, not hardcoded
- [ ] HTTPS/WSS is used in production (not HTTP/WS)
- [ ] CORS is configured correctly if backend and transcription service are on different domains

---

## 10. Architecture Diagram

```
┌─────────────┐
│ Flutter App │
└──────┬──────┘
       │
       │ 1. POST /api/livekit/token
       │    Headers: Authorization: Bearer <user-token>
       ▼
┌──────────────────┐
│ Nest.js Backend  │
│                  │
│ JwtService.sign({│  2. Generate transcription JWT
│   userId,        │     with JWT_SECRET
│   roomName,      │
│   participant    │
│ })               │
└──────┬───────────┘
       │
       │ 3. Return { livekitToken, transcriptionToken }
       ▼
┌─────────────┐
│ Flutter App │
│             │
│ Connect to: │  4. WebSocket with token
│ LiveKit     │
│ Transcribe  │
└──────┬──────┘
       │
       │ 5. ws://transcription?token=...
       ▼
┌────────────────────────────────┐
│ Transcription Service          │
│                                │
│ Validates JWT with JWT_SECRET  │
│ Extracts userId, roomName      │
│ Authorizes connection           │
└────────┬───────────────────────┘
         │
         │ 6. POST /api/interviews/analyze
         │    Headers: Authorization: Bearer <service-api-key>
         ▼
┌──────────────────┐
│ Nest.js Backend  │
│                  │
│ Validates API key│  7. Store in MongoDB
│ Sends to OpenAI  │  8. Return interviewId
└──────────────────┘
```

---

## 11. Environment Variables Summary

### Backend `.env`
```env
# JWT for transcription service authentication
JWT_SECRET=<32+ char secret>
JWT_ISSUER=interview-backend
JWT_AUDIENCE=transcription-service

# Service-to-service authentication
TRANSCRIPTION_SERVICE_API_KEY=<service api key>
```

### Transcription Service `.env`
```env
# JWT validation (MUST match backend)
JWT_SECRET=<32+ char secret - SAME as backend>
JWT_ISSUER=interview-backend
JWT_AUDIENCE=transcription-service

# Backend communication
BACKEND_URL=http://localhost:3000
BACKEND_API_KEY=<service api key - SAME as backend's TRANSCRIPTION_SERVICE_API_KEY>
```

---

## 12. Next Steps

1. ✅ Implement JWT token generation endpoint in backend
2. ✅ Add service-to-service API key authentication
3. ✅ Update Flutter app to request and use transcription token
4. ✅ Test complete flow end-to-end
5. ✅ Deploy to staging/production with production secrets

---

## Support

For questions or issues:
- Check transcription service logs for authentication errors
- Verify JWT tokens at [jwt.io](https://jwt.io)
- Ensure secrets match between services
- Test with health check endpoint first: `GET http://localhost:3001/health`

---

**Last Updated**: December 2024
**Transcription Service Version**: 1.0.0
**Required Backend Changes**: JWT token generation, service API key validation
