# Bibble AI - Backend Server

A Node.js and Express backend server for the Bibble AI mobile app that provides AI-generated Bible content.

## Features

- AI-generated Bible quotes with explanations
- Personalized prayers based on user mood
- Daily devotional stories with AI-generated images
- User preferences management
- Analytics and logging of AI interactions

## Tech Stack

- Node.js with Express
- TypeScript with ES Modules
- MongoDB Atlas for database
- OpenAI API for content generation
- JWT for authentication

## API Endpoints

### Authentication
- `POST /api/users/register` - Register a new user
- `POST /api/users/login` - Login user
- `GET /api/users/profile` - Get user profile

### AI Content
- `GET /api/ai/daily-quote` - Get a Bible quote with AI explanation
- `POST /api/ai/prayer` - Generate a personalized prayer based on user mood
- `GET /api/ai/story` - Generate a daily devotional story with an image

### User Preferences
- `GET /api/user/preferences` - Get user preferences
- `POST /api/user/preferences` - Update user preferences

### Logs and Analytics
- `GET /api/logs` - Get user interaction logs
- `GET /api/logs/analytics` - Get analytics summary

## Setup Instructions

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file with the following variables:
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/bibleai
   JWT_SECRET=your_jwt_secret_key
   OPENAI_API_KEY=your_openai_api_key
   ```
4. Build the TypeScript code:
   ```
   npm run build
   ```
5. Start the server:
   ```
   npm start
   ```
   
## Development

For development with hot reloading:
```
npm run dev
```

## Deployment

This server is ready for deployment on platforms like Render or Railway.

## Project Structure

```
server/
├── dist/               # Compiled TypeScript output
├── src/
│   ├── config/         # Configuration files
│   ├── controllers/    # Route controllers
│   ├── middleware/     # Express middleware
│   ├── models/         # MongoDB schemas
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   ├── utils/          # Utility functions
│   └── index.ts        # Entry point
├── .env                # Environment variables
├── .env.example        # Example environment variables
├── package.json        # Dependencies and scripts
└── tsconfig.json       # TypeScript configuration
```
