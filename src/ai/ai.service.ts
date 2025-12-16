import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  SessionData,
  MarketSizingAnalysisResult,
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

  async analyzeMarketSizingInterview(
    sessionData: SessionData,
    caseQuestion: string,
  ): Promise<MarketSizingAnalysisResult> {
    this.logger.log(
      `Starting MBB-aligned market sizing analysis for: ${caseQuestion}`,
    );

    const prompt = this.buildMarketSizingPrompt(sessionData, caseQuestion);

    const response = await this.openai.chat.completions.create({
      model: 'gpt-5.2-chat-latest',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert MBB (McKinsey, BCG, Bain) case interview evaluator specializing in market sizing questions. Evaluate based on ACTUAL MBB CRITERIA using a 5-point scale. Always return valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new InternalServerErrorException('Empty response from OpenAI');
    }

    const analysis = JSON.parse(content) as MarketSizingAnalysisResult;

    this.logger.log('Market sizing analysis completed successfully');
    return this.validateAndFormatMarketSizingAnalysis(analysis);
  }

  private buildMarketSizingPrompt(
    sessionData: SessionData,
    caseQuestion: string,
  ): string {
    return `You are an expert MBB (McKinsey, BCG, Bain) case interview evaluator specializing in market sizing questions.

Evaluate this candidate's market sizing performance based on ACTUAL MBB CRITERIA using a 5-point scale:
1 = Insufficient, 2 = Adequate, 3 = Good, 4 = Very Good, 5 = Outstanding

CASE QUESTION: "${caseQuestion}"

FULL TRANSCRIPT:
${sessionData.transcript}

SPEECH METRICS:
- Average pace: ${sessionData.averagePace} WPM
- Filler words: ${sessionData.fillers.length}
- Long pauses: ${sessionData.pauses.length}
- Duration: ${Math.round(sessionData.duration / 60)} minutes

---

EVALUATION CRITERIA (from actual MBB rubrics):

1. STRUCTURED PROBLEM-SOLVING (30% weight):
   - Did candidate ask clarifying questions upfront? (highest failure point)
   - Was a clear framework articulated? ("I'll use top-down approach...")
   - Is segmentation MECE (mutually exclusive, collectively exhaustive)?
   - Was structure communicated within first 1-2 minutes?

2. BUSINESS JUDGMENT & ASSUMPTIONS (25% weight):
   - Are assumptions explicitly stated in transcript?
   - Are assumptions JUSTIFIED with reasoning? ("I assume X because Y...")
   - Are estimates realistic and commercially sound?
   - Quality over quantity of assumptions

3. QUANTITATIVE SKILLS (20% weight):
   - Are calculations shown step-by-step in transcript?
   - Are calculations VERBALIZED (not silent periods during math)?
   - Is the arithmetic accurate?
   - Can you follow the mathematical logic?

4. COMMUNICATION (15% weight):
   - Clear, organized explanations?
   - Appropriate pace (120-180 WPM ideal)?
   - Minimal filler words (<15 for 10min)?
   - No extended silences during calculations?

5. SANITY CHECK (10% weight):
   - Did candidate explicitly validate their answer?
   - Was sanity check reasoning VERBALIZED? ("This is reasonable because...")
   - Did they catch obviously wrong results?

---

CRITICAL GUIDANCE:
- Process > Precision: You are NOT scoring answer accuracy. Score the THINKING PROCESS.
- Verbalization is key: Students must articulate their thinking OUT LOUD.
- Look for explicit statements in transcript, not implicit thinking.
- Most students fail on: clarifying questions, verbalizing calculations, justifying assumptions.
- Do NOT reward memorized frameworks - reward logical thinking.

RETURN VALID JSON with this EXACT structure:
{
  "structuredProblemSolving": {
    "score": <1-5>,
    "feedback": "<specific feedback with examples from transcript>",
    "frameworkDetected": "<top-down|bottom-up|hybrid|none>",
    "meceApplied": <true|false>,
    "clarifyingQuestionsAsked": <true|false>
  },
  "businessJudgment": {
    "score": <1-5>,
    "feedback": "<specific feedback>",
    "assumptionsStated": <true|false>,
    "assumptionsJustified": <true|false>,
    "assumptionQuality": "<quote 2-3 assumption examples from transcript>"
  },
  "quantitativeSkills": {
    "score": <1-5>,
    "feedback": "<specific feedback>",
    "mathShownStepByStep": <true|false>,
    "mathVerbalized": <true|false>,
    "calculationsAccurate": <true|false>
  },
  "communication": {
    "score": <1-5>,
    "feedback": "<reference pace, fillers, clarity>"
  },
  "sanityCheck": {
    "score": <1-5>,
    "feedback": "<specific feedback>",
    "sanityCheckPerformed": <true|false>,
    "sanityCheckVerbalized": <true|false>
  },
  "overallWeightedScore": <calculated: score1*0.3 + score2*0.25 + score3*0.2 + score4*0.15 + score5*0.1>,
  "overallLabel": "<Insufficient|Adequate|Good|Very Good|Outstanding>",
  "priorityImprovements": [
    {"timestamp": "MM:SS", "feedback": "<actionable improvement>"},
    {"timestamp": "MM:SS", "feedback": "<actionable improvement>"},
    {"timestamp": "MM:SS", "feedback": "<actionable improvement>"}
  ],
  "highlights": [
    "<positive aspect 1>",
    "<positive aspect 2>"
  ]
}`;
  }

  private validateAndFormatMarketSizingAnalysis(
    analysis: MarketSizingAnalysisResult,
  ): MarketSizingAnalysisResult {
    // Calculate weighted score if not provided or incorrect
    const calculatedScore =
      (analysis.structuredProblemSolving?.score || 0) * 0.3 +
      (analysis.businessJudgment?.score || 0) * 0.25 +
      (analysis.quantitativeSkills?.score || 0) * 0.2 +
      (analysis.communication?.score || 0) * 0.15 +
      (analysis.sanityCheck?.score || 0) * 0.1;

    const roundedScore = Math.round(calculatedScore * 10) / 10;

    // Map score to label
    let label: MarketSizingAnalysisResult['overallLabel'] = 'Insufficient';
    if (roundedScore >= 4.5) label = 'Outstanding';
    else if (roundedScore >= 3.5) label = 'Very Good';
    else if (roundedScore >= 2.5) label = 'Good';
    else if (roundedScore >= 1.5) label = 'Adequate';

    return {
      ...analysis,
      overallWeightedScore: roundedScore,
      overallLabel: label,
      priorityImprovements: analysis.priorityImprovements || [],
      highlights: analysis.highlights || [],
    };
  }
}
