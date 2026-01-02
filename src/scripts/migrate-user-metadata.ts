import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getModelToken } from '@nestjs/mongoose';
import { User } from '../schemas/user.schema';
import { Model } from 'mongoose';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const userModel: Model<User> = app.get(getModelToken(User.name));

  console.log('🔄 Starting user metadata migration...');

  try {
    // Find all users without metadata field
    const usersWithoutMetadata = await userModel.countDocuments({
      metadata: { $exists: false },
    });

    console.log(
      `📊 Found ${usersWithoutMetadata} users without metadata field`,
    );

    if (usersWithoutMetadata === 0) {
      console.log(
        '✅ All users already have metadata field. Nothing to migrate.',
      );
      await app.close();
      process.exit(0);
      return;
    }

    // Update all users without metadata
    const result = await userModel.updateMany(
      { metadata: { $exists: false } },
      {
        $set: {
          metadata: { hasGrantedInterviewConsent: false },
        },
      },
    );

    console.log(
      `✅ Updated ${result.modifiedCount} users with default metadata`,
    );

    // Verify migration
    const remainingUsers = await userModel.countDocuments({
      metadata: { $exists: false },
    });

    if (remainingUsers === 0) {
      console.log('✅ Migration verification passed!');
      console.log('\n🎉 Migration completed successfully!');
    } else {
      console.warn(
        `⚠️  Warning: ${remainingUsers} users still missing metadata field`,
      );
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }

  await app.close();
  process.exit(0);
}

void bootstrap();
