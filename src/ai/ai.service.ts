import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  SessionData,
  AIAnalysisResult,
} from '../common/interfaces/ai.interface';
import { LoggerService } from '../common/logger/logger.service';

@Injectable()
export class AIService {
  private openai: OpenAI;

  constructor(
    private configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(AIService.name);

    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException(
        'OpenAI API key is not configured',
      );
    }

    this.openai = new OpenAI({ apiKey });
  }

  async analyzeInterview(sessionData: SessionData): Promise<AIAnalysisResult> {
    this.logger.log('Starting AI analysis for interview session');

    const prompt = this.buildPrompt(sessionData);

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert interview coach analyzing practice interview sessions. Provide detailed, actionable feedback in JSON format.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new InternalServerErrorException('Empty response from OpenAI');
    }

    const analysis = JSON.parse(content) as AIAnalysisResult;

    this.logger.log('AI analysis completed successfully');
    return this.validateAndFormatAnalysis(analysis);
  }

  private buildPrompt(sessionData: SessionData): string {
    const paceTimelineStr = sessionData.paceTimeline
      .map((p) => `${p.timestamp}s: ${p.wpm} WPM`)
      .join('\n');

    const fillersStr = sessionData.fillers
      .slice(0, 10)
      .map(
        (f) =>
          `"${f.contextBefore} [${f.word}] ${f.contextAfter}" at ${f.timestamp}s`,
      )
      .join('\n');

    const pausesStr = sessionData.pauses
      .map((p) => `${p.duration}s pause at ${p.timestamp}s`)
      .join('\n');

    return `You are an expert interview coach analyzing a practice interview session.

INTERVIEW TRANSCRIPT:
${sessionData.transcript}

SPEECH METRICS:
- Duration: ${sessionData.duration}s
- Total Words: ${sessionData.totalWords}
- Average Pace: ${sessionData.averagePace} WPM

PACE TIMELINE (30-second segments):
${paceTimelineStr}

FILLER WORDS (${sessionData.fillers.length} total):
${fillersStr}

PAUSES > 1.2s (${sessionData.pauses.length} total):
${pausesStr}

Provide a comprehensive analysis with:
1. Overall Performance Score (1-10)
2. Pace Analysis (highlight inconsistencies, stress indicators)
3. Filler Word Patterns (identify triggers and when they occur)
4. Confidence Assessment (1-10)
5. Top 3 Specific Improvements (with timestamps)
6. Positive Highlights (2-3 items)

Format your response as JSON with this exact structure:
{
  "overallScore": number,
  "summary": string,
  "paceAnalysis": string,
  "fillerAnalysis": string,
  "confidenceScore": number,
  "improvements": [
    {
      "title": string,
      "timestamp": number,
      "description": string
    }
  ],
  "highlights": [string]
}`;
  }

  private validateAndFormatAnalysis(
    analysis: AIAnalysisResult,
  ): AIAnalysisResult {
    return {
      overallScore: analysis.overallScore || 0,
      summary: analysis.summary || '',
      paceAnalysis: analysis.paceAnalysis || '',
      fillerAnalysis: analysis.fillerAnalysis || '',
      confidenceScore: analysis.confidenceScore || 0,
      improvements: analysis.improvements || [],
      highlights: analysis.highlights || [],
    };
  }
}
