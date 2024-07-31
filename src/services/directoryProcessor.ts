import * as fs from 'fs/promises';
import path from 'path';
import { processFile } from './fileProcessor';

export const processDirectory = async (directoryPath: string, type: string): Promise<void> => {
  try {
    const files = await fs.readdir(directoryPath);
    for (const file of files) {
      const filePath = path.join(directoryPath, file);
      const fileStat = await fs.stat(filePath);
      if (fileStat.isDirectory()) {
        await processDirectory(filePath, type);
      } else {
        await processFile(filePath, type);
      }
    }
  } catch (error) {
    console.error(`Error processing directory ${directoryPath}: ${error}`);
  }
}
