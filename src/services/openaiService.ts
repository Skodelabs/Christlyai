import OpenAI from "openai";
import { config } from "../config/env";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { downloadAndSaveImage } from '../utils/imageUtils';
import { estimateTokens } from "../utils/estimateTokens";

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
  maxTokens: number = 8192,
  jsonFormat: boolean = false
): Promise<{ text: string; tokensUsed: number }> => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
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
 * Generate image using DALL-E with safety guidelines
 */
export const generateImage = async (
  prompt: string
): Promise<{ imageUrl: string }> => {
  try {
    // Add safety guidelines to prevent image generation errors
    const safetyGuidelines = `
      IMPORTANT GUIDELINES FOR THE IMAGE:
      - Do not depict the face of God or any divine being
      - Represent religious figures with respect and dignity
      - Use symbolic imagery like light, doves, or crosses for divine presence
      - Avoid controversial or disrespectful religious interpretations
      - Create a peaceful, inspiring scene with natural elements
      - Use a classical, sacred art style
      - No text in the image
      - No explicit or violent content
      - Depict all characters with dignity and modesty
    `;

    // Create a safe prompt by combining the original with guidelines
    const safePrompt = `
      Create a beautiful, inspirational Christian image with the following guidelines:
      ${safetyGuidelines}

      Based on this theme: ${prompt}
    `;

    console.log("Sending image generation prompt:", safePrompt.substring(0, 500) + "...");

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: safePrompt,
      n: 1,
      size: "1024x1024",
    });

    const openaiImageUrl = response.data?.[0]?.url;

    console.log("OpenAI image URL:", openaiImageUrl);
    if (!openaiImageUrl) {
      throw new Error("No image URL returned from OpenAI");
    }

    // Download and save the image locally
    try {
      console.log("Downloading and saving image locally...");
      const localImageUrl = await downloadAndSaveImage(openaiImageUrl);
      console.log("Image saved locally at:", localImageUrl);
      
      // Return the local image URL
      return {
        imageUrl: localImageUrl,
      };
    } catch (downloadError) {
      console.error("Error downloading image, falling back to OpenAI URL:", downloadError);
      
      // Fallback to the OpenAI URL if download fails
      return {
        imageUrl: openaiImageUrl,
      };
    }
  } catch (error) {
    console.error("OpenAI image generation error:", error);
    throw error; // Or handle it upstream
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

  IMPORTANT: You must return a valid JSON object with the following structure:
  {
    "prayer": "your prayer text here",
    "imagePrompt": "your image prompt here"
  }
  
  Do not include any markdown formatting, code blocks, or any text outside of the JSON object.`;

  const { text, tokensUsed } = await generateText(prompt, 2048, true);

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
 * Generate devotional story with optional image and audio
 * @param userId - The user ID to check for previous stories
 * @param previousTitles - Optional array of previously generated story titles to avoid repetition
 * @param topic - Optional topic for the story
 * @param storyType - Type of story ('real' for biblical, 'imaginary' for modern parable)
 * @param wordCount - Target word count for the story
 * @param generateImage - Whether to generate an image for the story (default: true)
 * @param generateAudio - Whether to generate audio narration for the story (default: true)
 */
export const generateDevotionalStory = async (
  userId?: string, 
  previousTitles: string[] = [],
  topic?: string,
  storyType: 'real' | 'imaginary' = 'real',
  wordCount: number = 500,
  isGenerateImage  : boolean = true,
  isGenerateAudio: boolean = true
): Promise<{
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

  // Determine the type of story based on storyType parameter
  const storyTypePrompt = storyType === 'real' 
    ? 'Create a Biblical story based on real events from the Bible' 
    : 'Create a modern Christian parable (fictional story with a Biblical message)';
  
  // Include topic if provided
  const topicPrompt = topic 
    ? `The story should focus on the topic of "${topic}".` 
    : 'Choose any appropriate Biblical theme or principle for the story.';
  
  const storyPrompt = `${storyTypePrompt} (about ${wordCount} words) that teaches a Biblical principle.
  ${topicPrompt}
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
  Do not include any markdown formatting, code blocks, or any text outside of the JSON object.`;

  // Calculate token limit based on word count - roughly 1.5x the word count for output tokens
  // plus extra buffer for the prompt and response formatting

  const { text, tokensUsed } = await generateText(storyPrompt, estimateTokens(wordCount), true);

  try {
    // Clean the text in case it contains markdown formatting
    const cleanedText = text.replace(/```json|```/g, "").trim();
    const parsedResponse = JSON.parse(cleanedText);

    // Generate an image if requested
    let imageUrl = "";
    if (isGenerateImage) {
      try {
        const imagePrompt = parsedResponse.imagePrompt || 
          `Create an inspirational Christian image representing this devotional: ${parsedResponse.title}. The devotional is about: ${parsedResponse.lesson}`;
        // Avoid name collision with the generateImage parameter

        if(isGenerateImage){
          const imageResult = await generateImage(imagePrompt);
          imageUrl = imageResult.imageUrl;
          console.log("Image generated successfully for story");
        }
      } catch (imageError) {
        console.error("Failed to generate image for story:", imageError);
        // Continue without image if it fails
      }
    } else {
      console.log("Image generation skipped as per user request");
    }

    // Generate audio narration if requested
    let audioUrl = "";
    if (isGenerateAudio) {
      try {
        // Limit the audio content size by truncating the story if it's too long
        const maxAudioTextLength = 10000; // Limit to 2000 characters to prevent huge audio files
        
        // Create a shortened version of the story for audio if needed
        let storyForAudio = parsedResponse.story;
        if (storyForAudio.length > maxAudioTextLength - 200) { // Leave room for title, verse and lesson
          storyForAudio = storyForAudio.substring(0, maxAudioTextLength - 200) + "... [Story continues in text version]";
        }
        
        const storyText = `${parsedResponse.title}. ${parsedResponse.verse}. ${storyForAudio}. Key lesson: ${parsedResponse.lesson}`;
        const devotionalInstructions = `
          Speak in a warm, engaging storytelling tone that captures the listener's attention and imagination.
          Convey the emotional journey of the devotional with appropriate shifts in tone and pacing.
          Use a respectful, clear voice when reading Bible verses, slightly different from the narrative sections.
          Emphasize key moral lessons with a thoughtful, reflective quality.
          Keep the delivery conversational yet inspiring, as if sharing wisdom with a friend.
          Create a sense of narrative arc through your voice, building toward the spiritual insight.
        `;
        
        audioUrl = await generateSpeech(storyText, parsedResponse.title, devotionalInstructions, "fable");
        console.log("Audio generated successfully for story");
      } catch (audioError) {
        console.error("Failed to generate audio for story:", audioError);
        // Continue without audio if it fails
      }
    } else {
      console.log("Audio generation skipped as per user request");
    }

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
  wordCount: number = 500,
  isGenerateImage: boolean = true,
  isGenerateAudio: boolean = true
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

  Make sure the content is spiritually enriching, biblically accurate, and personally applicable.
  Do not include any markdown formatting, code blocks, or any text outside of the JSON object.`;

  const { text, tokensUsed } = await generateText(topicPrompt, estimateTokens(wordCount), true);

  try {
    // Clean the text in case it contains markdown formatting
    const cleanedText = text.replace(/```json|```/g, "").trim();
    const parsedResponse = JSON.parse(cleanedText);

    // Initialize image and audio URLs as empty strings
    let imageUrl = "";
    let audioUrl = "";
    
    // Generate an image if the flag is enabled
    if (isGenerateImage) {
      const imagePrompt = parsedResponse.imagePrompt || 
        `Create an inspirational Christian image representing the Biblical topic of "${topic}". The image should be respectful, spiritual, and evoke the essence of ${parsedResponse.verse}.`;
      const imageResult = await generateImage(imagePrompt);
      imageUrl = imageResult.imageUrl;
    }

    // Generate audio narration if the flag is enabled
    if (isGenerateAudio) {
      const audioText = `${parsedResponse.title}. ${parsedResponse.verse}. ${parsedResponse.content}. ${parsedResponse.explanation}`;
      const topicInstructions = `
        Speak in a deeply reverent, prayerful, and contemplative tone appropriate for Bible verses and spiritual reflection.
        Express genuine emotion and spiritual depth, with a voice that conveys awe and reverence for scripture.
        Use thoughtful pauses between sentences to allow for reflection, especially after Bible verses.
        Emphasize key words in the scripture with gentle emphasis to highlight their spiritual significance.
        Transition to a warmer, more personal tone during the explanation sections to connect the scripture to daily life.
        Maintain a peaceful, meditative quality throughout that invites the listener into prayer and reflection.
      `;
      audioUrl = await generateSpeech(audioText, parsedResponse.title, topicInstructions, "nova");
    }

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
