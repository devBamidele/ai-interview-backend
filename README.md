# AI Interview Backend

An AI-powered interview coaching platform backend built with NestJS. This backend processes real-time interview sessions, analyzes speech patterns, and provides AI-driven feedback using OpenAI GPT. Currently focused on market sizing case interview preparation for consulting students.

## Overview

This platform conducts live interview sessions with users via LiveKit voice agents, transcribes and analyzes speech in real-time, and provides detailed performance feedback based on actual MBB (McKinsey, BCG, Bain) evaluation criteria.

## Key Features

- **Real-time Interview Sessions**: Integration with LiveKit for live audio streaming and AI interviewer
- **Speech Analysis**: Tracks pace (WPM), filler words, pauses, and confidence metrics
- **AI-Powered Feedback**: Uses OpenAI GPT to analyze interview performance and provide detailed coaching
- **Market Sizing Specialization**: Evaluates structured thinking, assumption quality, quantitative skills, communication, and sanity checks
- **Async Processing**: Background AI analysis to prevent blocking HTTP requests
- **MongoDB Storage**: Persistent storage of interviews, transcripts, and analysis results

## Tech Stack

- **NestJS 11.0.1**: Backend framework
- **TypeScript 5.7.3**: Type-safe development
- **MongoDB 8.19.0** + **Mongoose 8.19.0**: Database and ODM
- **LiveKit SDK**: Real-time audio communication and token generation
- **OpenAI SDK 6.1.0**: AI analysis integration
- **Deepgram SDK 4.11.2**: Speech-to-text transcription
- **class-validator** & **class-transformer**: Input validation

## Architecture

```
AppModule
├── ConfigModule (Environment configuration)
├── MongooseModule (Database connection)
├── LoggerModule (Custom logging)
├── LivekitModule (Token generation for rooms)
├── InterviewsModule (Interview CRUD & AI processing)
└── AIModule (OpenAI integration)
```

## API Endpoints

### LiveKit
- `POST /api/livekit/token` - Generate access token for LiveKit room
  - Body: `{ roomName, participantName }`

### Interviews
- `POST /api/interviews/analyze` - Submit interview for AI analysis
  - Body: `{ roomName, participantIdentity, sessionData }`
- `GET /api/interviews/:interviewId` - Get interview results
- `GET /api/interviews/user/:participantIdentity` - Get user's interview history

## Environment Variables

Create a `.env` file with:

```env
MONGODB_URI=mongodb://localhost:27017/ai-interview
OPENAI_API_KEY=your_openai_api_key
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
LIVEKIT_URL=wss://your-livekit-url
PORT=3000
```

## Installation

```bash
npm install
```

## Running the Application

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
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

## AI Analysis Output

The backend analyzes interviews across 5 MBB-aligned dimensions:

1. **Structured Problem-Solving** (30%): Framework articulation, MECE segmentation
2. **Business Judgment & Assumptions** (25%): Realistic assumptions with justification
3. **Quantitative Skills** (20%): Math accuracy, step-by-step calculations
4. **Communication** (15%): Pace, clarity, minimal fillers
5. **Sanity Check** (10%): Answer validation and reality checks

Each dimension is scored 1-5 (Insufficient → Outstanding) with weighted overall score.

## Related Services

This backend works with:
- **Voice Agent**: LiveKit voice agent for conducting interviews ([livekit-voice-agent](../Documents/livekit-voice-agent))
- **Transcription Service**: Node.js service for real-time speech-to-text ([transcription-service](../transcription-service))
- **Mobile Frontend**: Flutter app for user interface ([ai_interview_mvp](../../../AndroidStudioProjects/ai_interview_mvp))

## License

UNLICENSED
