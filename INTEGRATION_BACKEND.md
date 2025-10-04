# Backend Integration Guide

**Audience:** For use in the Nest.js backend codebase

---

## System Architecture

```
Flutter App ←→ Nest.js Backend (YOU ARE HERE)
                      ↓
            Transcription Service
                      ↓
              LiveKit + Deepgram
```

---

## Your Role (Nest.js Backend)

You are the **central orchestrator** that:
1. Generates LiveKit tokens for Flutter clients
2. Receives transcription summaries from Transcription Service
3. Processes data with OpenAI for insights
4. Stores everything in MongoDB
5. Returns analysis results to Flutter

---

## Integration Points

### 1. Token Generation Endpoint

**Flutter calls:**
```
POST /api/livekit/token
Body: {
  roomName: "interview-123",
  participantName: "John Doe"
}
```

**You respond:**
```json
{
  "token": "eyJhbGc...",
  "url": "wss://your-project.livekit.cloud"
}
```

**Purpose:** Allows Flutter to join LiveKit room for voice agent interview.

---

### 2. Interview Analysis Endpoint

**Transcription Service POSTs to you:**
```
POST /api/interviews/analyze
Body: {
  roomName: "interview-123",
  participantIdentity: "user-456",
  sessionData: {
    transcript: "Full conversation text...",
    duration: 295.4,
    totalWords: 423,
    averagePace: 145,
    paceTimeline: [
      {timestamp: 0, wpm: 120, segmentStart: 0, segmentEnd: 30},
      {timestamp: 30, wpm: 165, segmentStart: 30, segmentEnd: 60}
    ],
    fillers: [
      {
        word: "um",
        timestamp: 5.2,
        contextBefore: "So tell me about your",
        contextAfter: "I have experience with React"
      }
    ],
    pauses: [
      {duration: 2.1, timestamp: 45.3}
    ],
    words: [...], // All words with timestamps
    transcriptSegments: [...]
  }
}
```

**You should:**
1. Create/find User record in MongoDB
2. Create Interview record with session data
3. Send transcript + metrics to OpenAI with prompt like:
   ```
   Analyze this interview practice session:

   TRANSCRIPT: {transcript}
   PACE DATA: {paceTimeline}
   FILLERS: {fillers with context}
   PAUSES: {pauses}

   Provide:
   1. Overall performance score (1-10)
   2. Pace analysis (consistency, stress indicators)
   3. Filler word patterns (when/why they occur)
   4. Confidence assessment
   5. Top 3 specific improvements with timestamps
   6. Positive highlights
   ```
4. Parse OpenAI response
5. Store analysis in MongoDB
6. Return response:
   ```json
   {
     "interviewId": "uuid",
     "status": "completed",
     "message": "Analysis complete"
   }
   ```

---

### 3. Get Analysis Endpoint

**Flutter calls:**
```
GET /api/interviews/:interviewId
```

**You respond:**
```json
{
  "id": "uuid",
  "userId": "user-456",
  "createdAt": "2025-10-03T14:30:00Z",
  "duration": 295.4,
  "transcript": "Full text...",
  "recordingUrl": "https://...",

  "metrics": {
    "averagePace": 145,
    "totalWords": 423,
    "fillerCount": 12,
    "pauseCount": 8,
    "paceTimeline": [...]
  },

  "aiAnalysis": {
    "overallScore": 7.5,
    "summary": "Good performance with areas to improve...",
    "paceAnalysis": "Speaking pace was generally consistent...",
    "fillerAnalysis": "Um/uh appeared frequently before technical terms...",
    "confidenceScore": 7.0,
    "improvements": [
      {
        "title": "Reduce filler words before technical answers",
        "timestamp": 45.2,
        "description": "..."
      }
    ],
    "highlights": [
      "Clear articulation of technical concepts",
      "Good enthusiasm throughout"
    ]
  }
}
```

---

## MongoDB Schema Suggestions

### User Collection
```typescript
{
  _id: ObjectId,
  email: string,
  name: string,
  createdAt: Date
}
```

### Interview Collection
```typescript
{
  _id: ObjectId,
  userId: ObjectId,
  roomName: string,
  participantIdentity: string,
  createdAt: Date,
  duration: number,

  // Raw data from transcription service
  transcript: string,
  totalWords: number,
  averagePace: number,
  paceTimeline: Array<{timestamp, wpm, segmentStart, segmentEnd}>,
  fillers: Array<{word, timestamp, contextBefore, contextAfter}>,
  pauses: Array<{duration, timestamp}>,
  words: Array<{word, start, end, confidence}>,

  // Optional: LiveKit recording URL
  recordingUrl?: string,

  // AI analysis results
  aiAnalysis: {
    overallScore: number,
    summary: string,
    paceAnalysis: string,
    fillerAnalysis: string,
    confidenceScore: number,
    improvements: Array<{title, timestamp, description}>,
    highlights: Array<string>
  },

  // Processing status
  status: 'processing' | 'completed' | 'failed',
  processedAt?: Date
}
```

---

## OpenAI Integration

**Recommended Model:** `gpt-4-turbo` or `gpt-4o`

**Sample Prompt Structure:**
```typescript
const prompt = `You are an expert interview coach analyzing a practice interview session.

INTERVIEW TRANSCRIPT:
${sessionData.transcript}

SPEECH METRICS:
- Duration: ${sessionData.duration}s
- Total Words: ${sessionData.totalWords}
- Average Pace: ${sessionData.averagePace} WPM

PACE TIMELINE (30-second segments):
${sessionData.paceTimeline.map(p => `${p.timestamp}s: ${p.wpm} WPM`).join('\n')}

FILLER WORDS (${sessionData.fillers.length} total):
${sessionData.fillers.slice(0, 10).map(f =>
  `"${f.contextBefore} [${f.word}] ${f.contextAfter}" at ${f.timestamp}s`
).join('\n')}

PAUSES > 1.2s (${sessionData.pauses.length} total):
${sessionData.pauses.map(p => `${p.duration}s pause at ${p.timestamp}s`).join('\n')}

Provide a comprehensive analysis with:
1. Overall Performance Score (1-10)
2. Pace Analysis (highlight inconsistencies, stress indicators)
3. Filler Word Patterns (identify triggers)
4. Confidence Assessment
5. Top 3 Specific Improvements (with timestamps)
6. Positive Highlights

Format your response as JSON.`;
```

---

## Error Handling

**If transcription service fails to reach you:**
- They will log the error
- You should implement retry logic or dead letter queue
- Consider webhook for async processing

**If OpenAI fails:**
- Store raw session data in MongoDB (status: 'failed')
- Implement retry mechanism
- Return partial results to Flutter if possible

---

## Environment Variables

Add to your Nest.js `.env`:
```env
# OpenAI
OPENAI_API_KEY=sk-...

# MongoDB
MONGODB_URI=mongodb://localhost:27017/interview-coach

# LiveKit (for token generation)
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
LIVEKIT_URL=wss://your-project.livekit.cloud

# Transcription Service (for webhooks if needed)
TRANSCRIPTION_SERVICE_URL=http://localhost:3001
```

---

## Quick Reference

| Service | Port | Purpose |
|---------|------|---------|
| **Nest.js Backend (YOU)** | 3000 | Token generation, AI analysis, data storage |
| Transcription Service | 3001 | STT + speech analysis |
| Flutter Frontend | - | User interface |
| LiveKit | Cloud | Audio streaming |
| Deepgram | Cloud | Speech-to-text |
| OpenAI | Cloud | AI insights |

---

## Testing

**Test analysis endpoint:**
```bash
curl -X POST http://localhost:3000/api/interviews/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "roomName": "test-room",
    "participantIdentity": "test-user",
    "sessionData": {
      "transcript": "Hello, I am testing the system.",
      "duration": 5.0,
      "totalWords": 7,
      "averagePace": 84,
      "paceTimeline": [],
      "fillers": [],
      "pauses": [],
      "words": [],
      "transcriptSegments": []
    }
  }'
```

---

## Related Files in Transcription Service

- `src/services/TranscriptionSession.ts` - Where the POST to your backend happens
- `src/config/index.ts` - Where `BACKEND_URL` is loaded
- `.env` - Contains `BACKEND_URL=http://localhost:3000`
