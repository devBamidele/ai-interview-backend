# Project Structure

## Overview
Clean architecture implementation with centralized logging and organized DTOs/interfaces.

## Directory Structure

```
src/
├── common/                      # Shared resources
│   ├── dto/                     # Data Transfer Objects
│   │   ├── livekit.dto.ts      # LiveKit token request DTOs
│   │   ├── interview.dto.ts    # Interview analysis DTOs with validation
│   │   └── index.ts            # Barrel export
│   ├── interfaces/              # TypeScript interfaces
│   │   ├── livekit.interface.ts    # LiveKit response types
│   │   ├── ai.interface.ts         # AI service types
│   │   ├── interview.interface.ts  # Interview response types
│   │   └── index.ts                # Barrel export
│   └── logger/                  # Centralized logging
│       ├── logger.service.ts    # Custom logger with timestamps
│       └── logger.module.ts     # Global logger module
│
├── schemas/                     # MongoDB schemas
│   ├── user.schema.ts          # User model
│   └── interview.schema.ts     # Interview model with nested schemas
│
├── livekit/                     # LiveKit integration
│   ├── livekit.controller.ts   # Token generation endpoint
│   ├── livekit.service.ts      # Token creation logic
│   └── livekit.module.ts       # Module definition
│
├── interviews/                  # Interview management
│   ├── interviews.controller.ts # REST endpoints (analyze, get)
│   ├── interviews.service.ts    # Business logic
│   └── interviews.module.ts     # Module with DB imports
│
├── ai/                          # OpenAI integration
│   ├── ai.service.ts           # AI analysis logic
│   └── ai.module.ts            # Module definition
│
├── app.module.ts               # Root module
└── main.ts                     # Bootstrap with global config
```

## Key Features

### 1. Centralized Logging
- **Location**: `src/common/logger/logger.service.ts`
- **Format**: `[timestamp] [level] [context] message`
- **Usage**: Inject `LoggerService` and call `setContext()`

```typescript
constructor(private readonly logger: LoggerService) {
  this.logger.setContext(MyService.name);
}
```

### 2. DTOs with Validation
- **Location**: `src/common/dto/`
- Uses `class-validator` decorators
- Automatic validation via `ValidationPipe`

### 3. Type-Safe Interfaces
- **Location**: `src/common/interfaces/`
- Separates data structure from validation
- Used for service return types

### 4. Clean Architecture Layers
- **Controllers**: HTTP/REST layer
- **Services**: Business logic
- **Schemas**: Data models
- **Common**: Shared utilities

## Import Examples

```typescript
// DTOs
import { CreateTokenDto, AnalyzeInterviewDto } from '../common/dto';

// Interfaces
import { LivekitTokenResponse, AIAnalysisResult } from '../common/interfaces';

// Logger
import { LoggerService } from '../common/logger/logger.service';
```

## Environment Variables
See `development.env` for required configuration.
