import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getModelToken } from '@nestjs/mongoose';
import { CaseQuestion } from '../schemas/case-question.schema';
import { Model } from 'mongoose';

const caseQuestions = [
  // EASY (3 questions)
  {
    question: 'How many smartphones are sold in the United States per year?',
    difficulty: 'easy',
    modelAnswerMin: 150_000_000,
    modelAnswerMax: 200_000_000,
    unit: 'smartphones per year',
    expertApproach:
      'Top-down: US population (330M) × smartphone ownership rate (85%) × replacement cycle (every 2-3 years) = ~150-200M',
  },
  {
    question: 'How many gas stations are there in Los Angeles?',
    difficulty: 'easy',
    modelAnswerMin: 2_000,
    modelAnswerMax: 3_000,
    unit: 'gas stations',
    expertApproach:
      'Bottom-up: LA population (4M) × cars per capita (0.7) × fill-ups per month (2) / stations served per month (1000) = ~2,800',
  },
  {
    question: 'How many pizzas are consumed in New York City annually?',
    difficulty: 'easy',
    modelAnswerMin: 300_000_000,
    modelAnswerMax: 400_000_000,
    unit: 'pizzas per year',
    expertApproach:
      'Top-down: NYC population (8M) × pizzas per person per year (40-50, NYC has strong pizza culture) = 320-400M',
  },

  // MEDIUM (4 questions)
  {
    question: 'What is the annual revenue of Starbucks stores in Chicago?',
    difficulty: 'medium',
    modelAnswerMin: 300_000_000,
    modelAnswerMax: 400_000_000,
    unit: 'dollars per year',
    expertApproach:
      'Estimate stores in Chicago (~200) × average revenue per store ($1.5-2M/year) = $300-400M',
  },
  {
    question: 'How many diapers are used in the US per day?',
    difficulty: 'medium',
    modelAnswerMin: 50_000_000,
    modelAnswerMax: 70_000_000,
    unit: 'diapers per day',
    expertApproach:
      'US births/year (4M) × avg diaper years (2.5) × diapers/day (6) = 60M diapers/day',
  },
  {
    question:
      "What's the market size for electric vehicle charging stations in California?",
    difficulty: 'medium',
    modelAnswerMin: 200_000_000,
    modelAnswerMax: 300_000_000,
    unit: 'dollars per year',
    expertApproach:
      'CA EVs (1M) × public charging usage (20%) × stations needed (5K) × revenue per station ($50K/year) = $250M',
  },
  {
    question: 'How many wedding cakes are sold in the US each year?',
    difficulty: 'medium',
    modelAnswerMin: 2_000_000,
    modelAnswerMax: 2_500_000,
    unit: 'wedding cakes per year',
    expertApproach:
      'US weddings per year (~2.5M) × percentage with cake (90%) = ~2.2M wedding cakes',
  },

  // HARD (3 questions)
  {
    question:
      'Estimate the global market for subscription-based meal kits in 2025',
    difficulty: 'hard',
    modelAnswerMin: 15_000_000_000,
    modelAnswerMax: 20_000_000_000,
    unit: 'dollars per year',
    expertApproach:
      'Developed countries with meal kit penetration × subscribers × avg spend/year. Consider US ($8B), Europe ($5B), Asia ($4B) = $15-20B',
  },
  {
    question:
      "What's the annual revenue potential for autonomous taxi services in San Francisco by 2030?",
    difficulty: 'hard',
    modelAnswerMin: 500_000_000,
    modelAnswerMax: 1_000_000_000,
    unit: 'dollars per year',
    expertApproach:
      'SF population (900K) × ride-sharing usage (30%) × autonomous adoption (40% by 2030) × trips/year (100) × avg fare ($15) = $500M-1B',
  },
  {
    question:
      'How many AI engineers will the tech industry need in the US by 2028?',
    difficulty: 'hard',
    modelAnswerMin: 150_000,
    modelAnswerMax: 250_000,
    unit: 'AI engineers',
    expertApproach:
      'US tech companies × AI investment growth × engineers per $100M AI spend. Factor in current shortage and explosive demand.',
  },
];

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const caseQuestionModel: Model<CaseQuestion> = app.get(
    getModelToken(CaseQuestion.name),
  );

  console.log('🌱 Seeding case questions...');

  try {
    // Clear existing questions
    await caseQuestionModel.deleteMany({});
    console.log('✅ Cleared existing questions');

    // Insert new questions
    const inserted = await caseQuestionModel.insertMany(caseQuestions);
    console.log(`✅ Inserted ${inserted.length} case questions`);

    console.log('\n📊 Breakdown:');
    const easy = inserted.filter((q) => q.difficulty === 'easy').length;
    const medium = inserted.filter((q) => q.difficulty === 'medium').length;
    const hard = inserted.filter((q) => q.difficulty === 'hard').length;
    console.log(`   Easy: ${easy}`);
    console.log(`   Medium: ${medium}`);
    console.log(`   Hard: ${hard}`);

    console.log('\n🎉 Seed completed successfully!');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }

  await app.close();
  process.exit(0);
}

void bootstrap();
