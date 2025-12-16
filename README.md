# AI Interview Backend

An AI-powered case interview coaching platform backend built with NestJS. This backend processes market sizing case interviews, analyzes speech patterns and problem-solving approach, and provides AI-driven feedback using OpenAI GPT based on MBB (McKinsey, BCG, Bain) evaluation criteria.

## Overview

This platform receives interview session data from LiveKit-based voice interviews, processes transcripts and speech analytics, and evaluates market sizing case performance across five key dimensions used by top consulting firms. The system stores case questions with model answers and provides detailed, actionable feedback to help consulting candidates improve their interview skills.

## Key Features

- **LiveKit Integration**: Generates tokens and manages LiveKit room access for voice-based interviews
- **Speech Analytics Processing**: Processes detailed speech metrics including pace (WPM), filler words, pauses, and word-level confidence scores
- **AI-Powered Evaluation**: Uses OpenAI GPT to analyze market sizing case performance and provide detailed coaching feedback
- **MBB-Aligned Assessment**: Evaluates five key dimensions - structured thinking, business judgment, quantitative skills, communication, and sanity checks
- **Case Question Management**: Database of market sizing questions with difficulty levels, model answer ranges, and expert approaches
- **Async Processing**: Background AI analysis to prevent blocking HTTP requests
- **Interview History**: Stores complete interview records including transcripts, speech analytics, and AI evaluations
- **User Progress Tracking**: Retrieves interview history by participant for tracking improvement over time

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
- `POST /livekit/token` - Generate access token for LiveKit room
  - Body: `{ roomName, participantName }`

### Interviews
- `POST /interviews/analyze` - Submit market sizing case interview for AI analysis
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
        "words": [...]
      }
    }
    ```
- `GET /interviews/:interviewId` - Get detailed interview results with AI evaluation
- `GET /interviews/user/:participantIdentity` - Get user's complete interview history

## Environment Variables

Create a `development.env` file with:

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

## Database Setup

Seed the database with market sizing case questions:

```bash
npm run seed:cases
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

## AI Evaluation Framework

The backend analyzes market sizing case interviews across 5 MBB-aligned dimensions:

1. **Structured Problem-Solving** (30%): Framework articulation, MECE segmentation, logical approach
2. **Business Judgment & Assumptions** (25%): Realistic assumptions with clear justification
3. **Quantitative Skills** (20%): Mathematical accuracy, step-by-step calculations, numerical reasoning
4. **Communication** (15%): Speech pace, clarity, minimal filler words, confidence
5. **Sanity Check** (10%): Answer validation, order of magnitude checks, reality testing

Each dimension receives:
- Score: 1-5 (Insufficient → Outstanding)
- Strengths: What the candidate did well
- Areas for Improvement: Specific feedback on weaknesses
- Actionable Recommendations: Concrete steps to improve

The system calculates a weighted overall score and provides comprehensive feedback to help candidates improve their consulting interview performance.

## System Architecture

This backend is part of a larger interview coaching system:
- **Backend (This Service)**: NestJS API for processing interviews, AI evaluation, and data storage
- **Voice Agent**: LiveKit-based AI interviewer that conducts market sizing case interviews
- **Transcription Service**: Real-time speech-to-text processing with Deepgram
- **Frontend**: Client application for users to practice interviews and view feedback

The backend receives session data from the voice agent, processes it asynchronously, and stores complete evaluation results including transcript, speech analytics, and AI-generated feedback.

## License

UNLICENSED
