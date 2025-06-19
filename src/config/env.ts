import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
const rootDir = path.join(__dirname, '../..');

dotenv.config({ path: path.join(rootDir, '.env') });

export const config = {
  port: process.env.PORT || 5000,
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/bibleai',
  jwtSecret: process.env.JWT_SECRET || 'default_jwt_secret',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  nodeEnv: process.env.NODE_ENV || 'development',
};
