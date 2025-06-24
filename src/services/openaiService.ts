import OpenAI from "openai";
import { config } from "../config/env";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { downloadAndSaveImage } from '../utils/imageUtils';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.openaiApiKey,
});

// Ensure audio directory exists
const audioDir = path.join(__dirname, "../../public/audio");
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
  console.log(`Created audio directory at: ${audioDir}`);
} else {
  console.log(`Audio directory exists at: ${audioDir}`);
}

/**
 * Generate text content using OpenAI API
 */
export const generateText = async (
  prompt: string,
  maxTokens: number = 4096,
  jsonFormat: boolean = false
): Promise<{ text: string; tokensUsed: number }> => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
      response_format: jsonFormat ? { type: "json_object" } : undefined,
    });

    const content = response.choices[0].message.content || "";

    // If JSON format was requested, ensure the response is valid JSON
    if (jsonFormat) {
      try {
        // Clean the text in case it contains markdown formatting
        const cleanedText = content.replace(/```json|```/g, "").trim();
        // Validate that it's parseable JSON
        JSON.parse(cleanedText);
        return {
          text: cleanedText,
          tokensUsed: response.usage?.total_tokens || 0,
        };
      } catch (error) {
        console.error("Invalid JSON response from OpenAI:", error);
        throw new Error("Failed to parse JSON response from OpenAI");
      }
    }

    return {
      text: content,
      tokensUsed: response.usage?.total_tokens || 0,
    };
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to generate text content");
  }
};

/**
 * Generate speech from text using OpenAI TTS API
 */
export const generateSpeech = async (
  text: string,
  title: string,
  instructions?: string,
  voice?: string
): Promise<string> => {
  try {
    // Generate a unique filename
    const filename = `${uuidv4()}.mp3`;
    const outputPath = path.join(audioDir, filename);

    // Call OpenAI TTS API
    const mp3 = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: voice || "fable", // Options: alloy, echo, fable, onyx, nova, shimmer
      input: text,
      instructions: instructions || `
        Speak in a warm, emotional, and storytelling tone as if sharing a heartfelt Bible story with children or families.
        Keep the delivery respectful and full of hope and inspiration.
        Use natural pauses, inflection, and gentle emphasis to highlight key moments and emotions.
        Avoid sounding robotic or overly dramatic—make it feel human, peaceful, and spiritually uplifting.
      `,
    });

    // Convert to Buffer and save to file
    const buffer = Buffer.from(await mp3.arrayBuffer());
    fs.writeFileSync(outputPath, buffer);

    // Return the URL to access the audio file
    // Note: This URL will be served by the static middleware
    // The path should be relative to the public directory
    console.log(`Generated audio file: ${outputPath}`);
    return `/audio/${filename}`;
  } catch (error) {
    console.error("OpenAI TTS API error:", error);
    throw new Error("Failed to generate speech");
  }
};

/**
 * Generate image using DALL-E
 */
export const generateImage = async (
  prompt: string
): Promise<{ imageUrl: string }> => {
  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: `
        ${prompt}
      `,
      n: 1,
      size: "1024x1024",
    });
    
    if (!response.data || response.data.length === 0) {
      throw new Error("No image was generated");
    }
    
    // Get the temporary OpenAI image URL
    const openaiImageUrl = response.data[0].url || "";
    
    if (!openaiImageUrl) {
      throw new Error("No image URL was returned");
    }
    
    // Download and save the image locally, get the local URL path
    const localImageUrl = await downloadAndSaveImage(openaiImageUrl);
    
    // Return the local image URL (this will be a path like /images/uuid.png)
    return {
      imageUrl: localImageUrl,
    };
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to generate image");
  }
};

/**
 * Generate daily Bible quote with explanation
 */
export const generateDailyQuote = async (): Promise<{
  quote: string;
  reference: string;
  explanation: string;
  tokensUsed: number;
}> => {
  const prompt = `Generate a meaningful Bible verse quote along with its reference. 
  Then provide a thoughtful explanation of the verse in modern context.
  
  IMPORTANT: You must return a valid JSON object with the following structure:
  {
    "quote": "The Bible verse text",
    "reference": "Book Chapter:Verse",
    "explanation": "A 2-3 paragraph explanation of the verse"
  }
  
  Do not include any markdown formatting, code blocks, or any text outside of the JSON object.`;

  const { text, tokensUsed } = await generateText(prompt, 800, true);

  try {
    // Clean the text in case it contains markdown formatting
    const cleanedText = text.replace(/```json|```/g, "").trim();
    const parsedResponse = JSON.parse(cleanedText);
    return {
      quote: parsedResponse.quote,
      reference: parsedResponse.reference,
      explanation: parsedResponse.explanation,
      tokensUsed,
    };
  } catch (error) {
    console.error("Failed to parse OpenAI response:", error, text);
    throw new Error("Failed to generate daily quote");
  }
};

/**
 * Generate personalized prayer based on user mood and recipient
 */
export const generatePrayer = async (
  mood: string,
  situation?: string,
  recipient?: { id: string; name: string; icon: string }
): Promise<{ prayer: string; imagePrompt: string; imageUrl: string; tokensUsed: number }> => {
  const recipientContext = recipient ? `
  This prayer is specifically for ${recipient.name === 'Me' ? 'the person praying themselves' : recipient.name}.
  Tailor the prayer to be appropriate for this recipient and their relationship to the person praying.` : '';

  const prompt = `Generate a heartfelt Christian prayer for someone who is feeling ${mood}.
  ${situation ? `They are currently experiencing this situation: "${situation}"` : ''}
  ${recipientContext}
  The prayer should be 3-4 paragraphs long, written in first person, and include relevant Bible references.
  Make it personal, comforting, and spiritually uplifting.
  ${situation ? `Address the specific situation they described in a meaningful way.` : ''}
  
  Also generate an image prompt that represents the emotional and spiritual essence of this prayer.
  The image prompt should be 50-100 words describing a scene that visually represents the prayer's theme.
  
  IMPORTANT GUIDELINES FOR THE IMAGE PROMPT:
  - When depicting God, represent as Jesus Christ with appropriate Christian imagery
  - Use the cross as the primary Christian symbol in imagery
  - Avoid sci-fi, space, or artificial CGI backgrounds
  - Use natural, peaceful, and emotionally inspiring elements (greenery, ocean, sunrise, etc.)
  - No text in images
  - Avoid blasphemy, disrespect, or controversial religious interpretations
  - Depict human and angelic characters with dignity and modesty
  - Use a soft, sacred, symbolic art style akin to classical or spiritual paintings with modern quality
  
  IMPORTANT: You must return a valid JSON object with the following structure:
  {
    "prayer": "your prayer text here",
    "imagePrompt": "your image prompt here"
  }
  
  Do not include any markdown formatting, code blocks, or any text outside of the JSON object.`;

  const { text, tokensUsed } = await generateText(prompt, 1000, true);

  try {
    // Clean the text in case it contains markdown formatting
    const cleanedText = text.replace(/```json|```/g, "").trim();
    const parsedResponse = JSON.parse(cleanedText);
    
    // Get the image prompt and generate an image
    const imagePrompt = parsedResponse.imagePrompt || 
      "A serene, spiritual scene representing Christian prayer with Jesus Christ and a cross, divine comfort with soft light, natural elements, and peaceful atmosphere";
    
    // Generate the image using DALL-E
    const { imageUrl } = await generateImage(imagePrompt);
    
    return {
      prayer: parsedResponse.prayer || text,
      imagePrompt: imagePrompt,
      imageUrl: imageUrl,
      tokensUsed,
    };
  } catch (error) {
    console.error("Failed to parse prayer response:", error, text);
    // Fallback to using the raw text if parsing fails
    const defaultImagePrompt = "A serene, spiritual scene representing Christian prayer with Jesus Christ and a cross, divine comfort with soft light, natural elements, and peaceful atmosphere";
    const { imageUrl } = await generateImage(defaultImagePrompt);
    
    return {
      prayer: text,
      imagePrompt: defaultImagePrompt,
      imageUrl: imageUrl,
      tokensUsed,
    };
  }
};

/**
 * Generate devotional story with image
 */
/**
 * Create a completion specifically for Bible quiz questions
 */
export const createCompletion = async (prompt: string): Promise<string> => {
  try {
    const { text } = await generateText(prompt, 4096, true);
    return text;
  } catch (error) {
    console.error('Error creating completion for Bible quiz:', error);
    throw new Error('Failed to generate Bible quiz question');
  }
};

/**
 * Generate 10 Bible quiz questions with fill-in-the-blank format
 * @param previousQuestions Array of previously asked questions to avoid duplicates
 */
export const generateBibleQuizQuestions = async (previousQuestions: string[] = []): Promise<Array<{
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}>> => {
  try {
    // Direct call to OpenAI API with JSON response format
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [{ 
        role: "user", 
        content: `Generate 10 Bible quiz questions. Each question should be a fill-in-the-blank format from Bible verses.
        For each question, provide 4 possible answers (one correct and three incorrect), and an explanation of why the correct answer is right.
        
        Make sure the questions cover different parts of the Bible (Old and New Testament).
        Ensure the options are plausible but only one is correct.
        The explanation should provide the full verse and reference.

        important:
        -do not add Fill in the blank: in the question.
        -in explanation also explain the meaning of the verse.
        -for blank always use 4 ____(this underscore 4 times).
        
        ${previousQuestions.length > 0 ? `IMPORTANT: Do NOT use any of these previously asked questions. Create entirely new questions that cover different Bible verses:
        ${previousQuestions.map(q => q.trim()).join("\n        ")}
        ` : ''}
        
        Return the response in this exact JSON format:
        {
          "questions": [
            {
              "question": "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not ___.'" ,
              "options": ["perish", "die", "suffer", "fall"],
              "correctAnswer": "perish",
              "explanation": "The correct answer is 'perish'. The full verse is John 3:16: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.'" // with explanation of meaning of the verse
            }
          ]
        }`
      }],
      response_format: { type: "json_object" },
      max_tokens: 4096,
    });

    const content = response.choices[0].message.content || "";
    
    // Parse the JSON response
    const parsedResponse = JSON.parse(content);
    
    // Extract the questions array from the response
    const questions = parsedResponse.questions || parsedResponse;
    
    // Validate the response structure
    if (!Array.isArray(questions)) {
      console.error('Invalid response format: not an array', questions);
      throw new Error('Invalid response format: expected array of questions');
    }
    
    // Ensure we have exactly 10 questions
    const validQuestions = questions.slice(0, 10);
    
    // Validate each question
    validQuestions.forEach((q, i) => {
      if (!q.question || !Array.isArray(q.options) || !q.correctAnswer || !q.explanation) {
        throw new Error(`Invalid question format at index ${i}`);
      }
      
      // Ensure we have exactly 4 options
      if (q.options.length !== 4) {
        // If fewer than 4, add dummy options
        while (q.options.length < 4) {
          q.options.push(`Option ${q.options.length + 1}`);
        }
        // If more than 4, truncate
        if (q.options.length > 4) {
          q.options = q.options.slice(0, 4);
        }
      }
      
      // Ensure correctAnswer is one of the options
      if (!q.options.includes(q.correctAnswer)) {
        // If not, replace the first option with the correct answer
        q.options[0] = q.correctAnswer;
      }
      
      // Randomize the position of the correct answer by shuffling the options array
      // First, store the correct answer
      const correctAnswer = q.correctAnswer;
      
      // Shuffle the options array
      for (let i = q.options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [q.options[i], q.options[j]] = [q.options[j], q.options[i]];
      }
      
      // Make sure we update the correctAnswer index if it changed during shuffling
      q.correctAnswer = correctAnswer;
    });
    
    return validQuestions;
  } catch (error) {
    console.error('Failed to generate Bible quiz questions:', error);
    throw new Error('Failed to generate Bible quiz questions');
  }
};

/**
 * Generate devotional story with image
 * @param userId - The user ID to check for previous stories
 * @param previousTitles - Optional array of previously generated story titles to avoid repetition
 */
export const generateDevotionalStory = async (userId?: string, previousTitles: string[] = []): Promise<{
  title: string;
  story: string;
  imageUrl: string;
  audioUrl: string;
  tokensUsed: number;
}> => {
  // Create a list of previous titles to avoid repetition
  const previousTitlesText = previousTitles.length > 0 
    ? `IMPORTANT: Avoid creating stories with these titles that were previously generated for this user:\n${previousTitles.join('\n')}\n\nCreate a completely new and original story with a different title and theme.`
    : '';

  const storyPrompt = `Create a short Christian devotional story (about 500 words) that teaches a Biblical principle.
  Include a title, a Bible verse reference that relates to the story, and a moral lesson.
  
  ${previousTitlesText}
  
  IMPORTANT: You must return a valid JSON object with the following structure:
  {
    "title": "Title of the devotional",
    "verse": "Bible verse reference",
    "story": "The devotional story content",
    "lesson": "The moral or spiritual lesson from the story",
    "imagePrompt": "A detailed image prompt describing a scene from the story that would make a good illustration (50-100 words)"
  }

    IMPORTANT GUIDELINES FOR THE IMAGE PROMPT:
  - When depicting God, represent as Jesus Christ with appropriate Christian imagery
  - Use the cross as the primary Christian symbol in imagery
  - Avoid sci-fi, space, or artificial CGI backgrounds
  - Use natural, peaceful, and emotionally inspiring elements (greenery, ocean, sunrise, etc.)
  - No text in images
  - Avoid blasphemy, disrespect, or controversial religious interpretations
  - Depict human and angelic characters with dignity and modesty
  - Use a soft, sacred, symbolic art style akin to classical or spiritual paintings with modern quality
  
  For the imagePrompt, follow these guidelines:
  - Very important: Do NOT create or show the face of God
  - Do not depict God bald, beardless, or in a way that could be culturally inaccurate or disrespectful
  - If God is represented, only show from behind or use symbolic light, glow, or divine presence with no facial details
  - The background should NOT look like science fiction, space, or artificial CGI graphics
  - Use natural, beautiful elements like lush greenery, ocean, sunrise, sunlight, or open skies
  - Make it look real, peaceful, and emotionally inspiring — as if from a sacred or devotional moment in nature
  - Do not include any text in the image
  - Avoid any form of blasphemy, disrespect, or controversial religious interpretations
  - Depict all human and angelic characters with dignity, modesty, and spiritual reverence
  - Use a soft, sacred, symbolic, and emotionally resonant art style — like classical or spiritual paintings but with modern digital quality
  
  Do not include any markdown formatting, code blocks, or any text outside of the JSON object.`;

  const { text, tokensUsed } = await generateText(storyPrompt, 4096, true);

  try {
    // Clean the text in case it contains markdown formatting
    const cleanedText = text.replace(/```json|```/g, "").trim();
    const parsedResponse = JSON.parse(cleanedText);

    // Generate an image based on the story using the provided imagePrompt or fallback to a default prompt
    const imagePrompt = parsedResponse.imagePrompt || 
      `Create an inspirational Christian image representing this devotional: ${parsedResponse.title}. The devotional is about: ${parsedResponse.lesson}`;
    const { imageUrl } = await generateImage(imagePrompt);

    // Generate audio narration for the story with a warm, storytelling voice
    const storyText = `${parsedResponse.title}. ${parsedResponse.verse}. ${parsedResponse.story}. ${parsedResponse.lesson}`;
    const devotionalInstructions = `
      Speak in a warm, engaging storytelling tone that captures the listener's attention and imagination.
      Convey the emotional journey of the devotional with appropriate shifts in tone and pacing.
      Use a respectful, clear voice when reading Bible verses, slightly different from the narrative sections.
      Emphasize key moral lessons with a thoughtful, reflective quality.
      Keep the delivery conversational yet inspiring, as if sharing wisdom with a friend.
      Create a sense of narrative arc through your voice, building toward the spiritual insight.
    `;
    const audioUrl = await generateSpeech(storyText, parsedResponse.title, devotionalInstructions, "fable");

    return {
      title: parsedResponse.title,
      story: `${parsedResponse.verse}\n\n${parsedResponse.story}\n\n${parsedResponse.lesson}`,
      imageUrl,
      audioUrl,
      tokensUsed,
    };
  } catch (error) {
    console.error("Failed to generate devotional story:", error, text);
    throw new Error("Failed to generate devotional story");
  }
};

/**
 * Generate Bible content based on a specific topic
 */
export const generateTopicContent = async (
  topic: string,
  bibleVersion: string = 'NIV',
  wordCount: number = 500
): Promise<{
  title: string;
  content: string;
  verse: string;
  explanation: string;
  imageUrl: string;
  audioUrl: string;
  bibleVersion: string;
  wordCount: number;
  tokensUsed: number;
}> => {
  // Calculate explanation word count (roughly 1/3 of the main content)
  const explanationWordCount = Math.floor(wordCount / 3);
  
  const topicPrompt = `Create Bible-based content about the topic "${topic}" using the ${bibleVersion} Bible translation.
  
  IMPORTANT: You must return a valid JSON object with the following structure:
  {
    "title": "An engaging title related to the topic",
    "verse": "A Bible verse that best represents this topic (include reference) from the ${bibleVersion} translation",
    "content": "A ${wordCount}-word reflection on this topic from a Biblical perspective",
    "explanation": "A ${explanationWordCount}-word explanation of how this topic applies to modern Christian life",
    "imagePrompt": "A detailed image prompt describing a meaningful visual representation of this topic (50-100 words)"
  }

    IMPORTANT GUIDELINES FOR THE IMAGE PROMPT:
  - When depicting God, represent as Jesus Christ with appropriate Christian imagery
  - Use the cross as the primary Christian symbol in imagery
  - Avoid sci-fi, space, or artificial CGI backgrounds
  - Use natural, peaceful, and emotionally inspiring elements (greenery, ocean, sunrise, etc.)
  - No text in images
  - Avoid blasphemy, disrespect, or controversial religious interpretations
  - Depict human and angelic characters with dignity and modesty
  - Use a soft, sacred, symbolic art style akin to classical or spiritual paintings with modern quality
  
  For the imagePrompt, follow these guidelines:
  - Very important: Do NOT create or show the face of God
  - Do not depict God bald, beardless, or in a way that could be culturally inaccurate or disrespectful
  - If God is represented, only show from behind or use symbolic light, glow, or divine presence with no facial details
  - The background should NOT look like science fiction, space, or artificial CGI graphics
  - Use natural, beautiful elements like lush greenery, ocean, sunrise, sunlight, or open skies
  - Make it look real, peaceful, and emotionally inspiring — as if from a sacred or devotional moment in nature
  - Do not include any text in the image
  - Avoid any form of blasphemy, disrespect, or controversial religious interpretations
  - Depict all human and angelic characters with dignity, modesty, and spiritual reverence
  - Use a soft, sacred, symbolic, and emotionally resonant art style — like classical or spiritual paintings but with modern digital quality
  
  Make sure the content is spiritually enriching, biblically accurate, and personally applicable.
  Do not include any markdown formatting, code blocks, or any text outside of the JSON object.`;

  const { text, tokensUsed } = await generateText(topicPrompt, 4096, true);

  try {
    // Clean the text in case it contains markdown formatting
    const cleanedText = text.replace(/```json|```/g, "").trim();
    const parsedResponse = JSON.parse(cleanedText);

    // Generate an image based on the topic using the provided imagePrompt or fallback to a default prompt
    const imagePrompt = parsedResponse.imagePrompt || 
      `Create an inspirational Christian image representing the Biblical topic of "${topic}". The image should be respectful, spiritual, and evoke the essence of ${parsedResponse.verse}.`;
    const { imageUrl } = await generateImage(imagePrompt);

    // Generate audio narration for the topic content with prayer-like, feeling-full voice
    const audioText = `${parsedResponse.title}. ${parsedResponse.verse}. ${parsedResponse.content}. ${parsedResponse.explanation}`;
    const topicInstructions = `
      Speak in a deeply reverent, prayerful, and contemplative tone appropriate for Bible verses and spiritual reflection.
      Express genuine emotion and spiritual depth, with a voice that conveys awe and reverence for scripture.
      Use thoughtful pauses between sentences to allow for reflection, especially after Bible verses.
      Emphasize key words in the scripture with gentle emphasis to highlight their spiritual significance.
      Transition to a warmer, more personal tone during the explanation sections to connect the scripture to daily life.
      Maintain a peaceful, meditative quality throughout that invites the listener into prayer and reflection.
    `;
    const audioUrl = await generateSpeech(audioText, parsedResponse.title, topicInstructions, "nova");

    return {
      title: parsedResponse.title,
      content: parsedResponse.content,
      verse: parsedResponse.verse,
      explanation: parsedResponse.explanation,
      imageUrl,
      audioUrl,
      bibleVersion,
      wordCount,
      tokensUsed,
    };
  } catch (error) {
    console.error("Failed to generate topic content:", error, text);
    throw new Error("Failed to generate content for topic: " + topic);
  }
};
