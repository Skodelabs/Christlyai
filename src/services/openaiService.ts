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
  title: string
): Promise<string> => {
  try {
    // Generate a unique filename
    const filename = `${uuidv4()}.mp3`;
    const outputPath = path.join(audioDir, filename);

    // Call OpenAI TTS API
    const mp3 = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "fable", // Options: alloy, echo, fable, onyx, nova, shimmer
      input: text,
      instructions: `
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
        Very important: Do **not** create or show the face of God.
        Do not depict God bald, beardless, or in a way that could be culturally inaccurate or disrespectful.
        If God is represented, only show from behind or use symbolic light, glow, or divine presence. Do not include any facial details at all.
    
        Create a respectful, artistic, Bible-themed image based on the following concept: ${prompt}.
        
        The background should **not** look like science fiction, space, or artificial CGI graphics.
        Use natural, beautiful elements like lush greenery, ocean, sunrise, sunlight, or open skies.
        Make it look real, peaceful, and emotionally inspiring — as if from a sacred or devotional moment in nature.
        
        Do not include any text in the image.
        Avoid any form of blasphemy, disrespect, or controversial religious interpretations.
        
        Depict all human and angelic characters with dignity, modesty, and spiritual reverence.
        Use a soft, sacred, symbolic, and emotionally resonant art style — like classical or spiritual paintings but with modern digital quality.
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
 * Generate personalized prayer based on user mood
 */
export const generatePrayer = async (
  mood: string,
  situation?: string,
  prayerFocus: string[] = ["general"]
): Promise<{ prayer: string; tokensUsed: number }> => {
  const prompt = `Generate a heartfelt Christian prayer for someone who is feeling ${mood}.
  ${situation ? `They are currently experiencing this situation: "${situation}"` : ''}
  The prayer should focus on these areas: ${prayerFocus.join(", ")}.
  The prayer should be 3-4 paragraphs long, written in first person, and include relevant Bible references.
  Make it personal, comforting, and spiritually uplifting.
  ${situation ? `Address the specific situation they described in a meaningful way.` : ''}
  
  IMPORTANT: You must return a valid JSON object with the following structure:
  {
    "prayer": "your prayer text here"
  }
  
  Do not include any markdown formatting, code blocks, or any text outside of the JSON object.`;

  const { text, tokensUsed } = await generateText(prompt, 800, true);

  try {
    // Clean the text in case it contains markdown formatting
    const cleanedText = text.replace(/```json|```/g, "").trim();
    const parsedResponse = JSON.parse(cleanedText);
    return {
      prayer: parsedResponse.prayer || text,
      tokensUsed,
    };
  } catch (error) {
    console.error("Failed to parse prayer response:", error, text);
    // Fallback to using the raw text if parsing fails
    return {
      prayer: text,
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
    const { text } = await generateText(prompt, 500, true);
    return text;
  } catch (error) {
    console.error('Error creating completion for Bible quiz:', error);
    throw new Error('Failed to generate Bible quiz question');
  }
};

/**
 * Generate 10 Bible quiz questions with fill-in-the-blank format
 */
export const generateBibleQuizQuestions = async (): Promise<Array<{
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
        
        Return the response in this exact JSON format:
        {
          "questions": [
            {
              "question": "Fill in the blank: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not ___.'" ,
              "options": ["perish", "die", "suffer", "fall"],
              "correctAnswer": "perish",
              "explanation": "The correct answer is 'perish'. The full verse is John 3:16: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.'"
            }
          ]
        }`
      }],
      response_format: { type: "json_object" },
      max_tokens: 2000,
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
    });
    
    return validQuestions;
  } catch (error) {
    console.error('Failed to generate Bible quiz questions:', error);
    throw new Error('Failed to generate Bible quiz questions');
  }
};

/**
 * Generate devotional story with image
 */
export const generateDevotionalStory = async (): Promise<{
  title: string;
  story: string;
  imageUrl: string;
  audioUrl: string;
  tokensUsed: number;
}> => {
  const storyPrompt = `Create a short Christian devotional story (about 500 words) that teaches a Biblical principle.
  Include a title, a Bible verse reference that relates to the story, and a moral lesson.
  
  IMPORTANT: You must return a valid JSON object with the following structure:
  {
    "title": "Title of the devotional",
    "verse": "Bible verse reference",
    "story": "The devotional story content",
    "lesson": "The moral or spiritual lesson from the story"
  }
  
  Do not include any markdown formatting, code blocks, or any text outside of the JSON object.`;

  const { text, tokensUsed } = await generateText(storyPrompt, 1000, true);

  try {
    // Clean the text in case it contains markdown formatting
    const cleanedText = text.replace(/```json|```/g, "").trim();
    const parsedResponse = JSON.parse(cleanedText);

    // Generate an image based on the story
    const imagePrompt = `Create an inspirational Christian image representing this devotional: ${parsedResponse.title}. The devotional is about: ${parsedResponse.lesson}`;
    const { imageUrl } = await generateImage(imagePrompt);

    // Generate audio narration for the story
    const storyText = `${parsedResponse.title}. ${parsedResponse.verse}. ${parsedResponse.story}. ${parsedResponse.lesson}`;
    const audioUrl = await generateSpeech(storyText, parsedResponse.title);

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
  wordCount: number = 300
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
    "explanation": "A ${explanationWordCount}-word explanation of how this topic applies to modern Christian life"
  }
  
  Make sure the content is spiritually enriching, biblically accurate, and personally applicable.
  Do not include any markdown formatting, code blocks, or any text outside of the JSON object.`;

  const { text, tokensUsed } = await generateText(topicPrompt, 1000, true);

  try {
    // Clean the text in case it contains markdown formatting
    const cleanedText = text.replace(/```json|```/g, "").trim();
    const parsedResponse = JSON.parse(cleanedText);

    // Generate an image based on the topic
    const imagePrompt = `Create an inspirational Christian image representing the Biblical topic of "${topic}". The image should be respectful, spiritual, and evoke the essence of ${parsedResponse.verse}.`;
    const { imageUrl } = await generateImage(imagePrompt);

    // Generate audio narration for the topic content
    const audioText = `${parsedResponse.title}. ${parsedResponse.verse}. ${parsedResponse.content}. ${parsedResponse.explanation}`;
    const audioUrl = await generateSpeech(audioText, parsedResponse.title);

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
