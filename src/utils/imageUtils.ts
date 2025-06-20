import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import logger from './logger';


/**
 * Directory where images will be stored
 */
const IMAGE_DIR = path.join(__dirname, '../../public/images');

/**
 * Ensure the images directory exists
 */
export const ensureImageDirExists = (): void => {
  logger.info(`Ensuring images directory exists at: ${IMAGE_DIR}`);
  
  if (!fs.existsSync(IMAGE_DIR)) {
    logger.info('Creating images directory as it does not exist');
    fs.mkdirSync(IMAGE_DIR, { recursive: true });
    logger.info(`Created images directory at: ${IMAGE_DIR}`);
  } else {
    logger.info('Images directory already exists');
  }
};

/**
 * Download an image from a URL and save it locally
 * @param imageUrl URL of the image to download
 * @returns Local path to the saved image
 */
export const downloadAndSaveImage = async (imageUrl: string): Promise<string> => {
  try {
    logger.info(`Attempting to download image from URL: ${imageUrl}`);
    
    // Ensure directory exists
    ensureImageDirExists();
    
    // Generate a unique filename with uuid
    const filename = `${uuidv4()}.png`;
    const localPath = path.join(IMAGE_DIR, filename);
    logger.info(`Will save image to: ${localPath}`);
    
    // Download the image
    const response = await axios({
      method: 'GET',
      url: imageUrl,
      responseType: 'stream',
    });
    
    logger.info('Image download successful, saving to disk');
    
    // Save the image to disk
    const writer = fs.createWriteStream(localPath);
    response.data.pipe(writer);
    
    // Return a promise that resolves when the file is written
    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        // Return the public URL path
        const publicUrl = `/images/${filename}`;
        logger.info(`Image saved successfully. Public URL: ${publicUrl}`);
        resolve(publicUrl);
      });
      writer.on('error', (err) => {
        logger.error(`Error saving image: ${err.message}`);
        reject(err);
      });
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Error downloading and saving image: ${errorMessage}`);
    console.error('Error downloading and saving image:', error);
    throw error;
  }
};
