import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { BibleVerse } from '../src/models/BibleVerse';

// Load environment variables
dotenv.config();

// Sample Bible verses (in a real app, this would be imported from a proper Bible database)
const sampleVerses = [
  {
    book: 'John',
    chapter: 3,
    verse: 16,
    text: 'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.',
    testament: 'NT',
    tags: ['salvation', 'love', 'eternal life'],
    difficulty: 'easy'
  },
  {
    book: 'Psalm',
    chapter: 23,
    verse: 1,
    text: 'The Lord is my shepherd, I lack nothing.',
    testament: 'OT',
    tags: ['trust', 'provision', 'faith'],
    difficulty: 'easy'
  },
  {
    book: 'Proverbs',
    chapter: 3,
    verse: 5,
    text: 'Trust in the Lord with all your heart and lean not on your own understanding.',
    testament: 'OT',
    tags: ['trust', 'wisdom', 'faith'],
    difficulty: 'medium'
  },
  {
    book: 'Romans',
    chapter: 8,
    verse: 28,
    text: 'And we know that in all things God works for the good of those who love him, who have been called according to his purpose.',
    testament: 'NT',
    tags: ['promise', 'faith', 'purpose'],
    difficulty: 'medium'
  },
  {
    book: 'Philippians',
    chapter: 4,
    verse: 13,
    text: 'I can do all this through him who gives me strength.',
    testament: 'NT',
    tags: ['strength', 'faith', 'empowerment'],
    difficulty: 'easy'
  },
  {
    book: 'Jeremiah',
    chapter: 29,
    verse: 11,
    text: 'For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future.',
    testament: 'OT',
    tags: ['promise', 'future', 'hope'],
    difficulty: 'medium'
  },
  {
    book: 'Matthew',
    chapter: 11,
    verse: 28,
    text: 'Come to me, all you who are weary and burdened, and I will give you rest.',
    testament: 'NT',
    tags: ['rest', 'comfort', 'invitation'],
    difficulty: 'easy'
  },
  {
    book: 'Isaiah',
    chapter: 40,
    verse: 31,
    text: 'But those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint.',
    testament: 'OT',
    tags: ['strength', 'hope', 'renewal'],
    difficulty: 'medium'
  },
  {
    book: '2 Timothy',
    chapter: 1,
    verse: 7,
    text: 'For the Spirit God gave us does not make us timid, but gives us power, love and self-discipline.',
    testament: 'NT',
    tags: ['spirit', 'power', 'love'],
    difficulty: 'medium'
  },
  {
    book: 'Joshua',
    chapter: 1,
    verse: 9,
    text: 'Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.',
    testament: 'OT',
    tags: ['courage', 'promise', 'presence'],
    difficulty: 'easy'
  }
];

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bibleai');
    console.log('Connected to MongoDB');
    
    // Clear existing data
    await BibleVerse.deleteMany({});
    console.log('Cleared existing Bible verses');
    
    // Insert sample verses
    await BibleVerse.insertMany(sampleVerses);
    console.log(`Inserted ${sampleVerses.length} Bible verses`);
    
    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seed function
seedDatabase();
