import { AIProvider } from './types';
import Tesseract from 'tesseract.js';
import pdfParse from 'pdf-parse';

export async function extractTextFromAttachment(
  fileBuffer: Buffer,
  mimeType: string,
  provider?: AIProvider
): Promise<string> {
  const isPdf = mimeType === 'application/pdf';
  const base64Data = fileBuffer.toString('base64');
  
  if (provider && provider.extractText) {
    try {
      const result = await provider.extractText(base64Data, mimeType);
      console.log(`[OCR] Extracted text using AI provider: ${provider.name}`);
      return result;
    } catch (err: any) {
      console.warn(`[OCR] AI provider ${provider.name} failed to extract text. Falling back to local OCR...`, err.message);
    }
  }

  // Local fallback
  console.log(`[OCR] Using local fallback for ${mimeType}`);
  if (isPdf) {
    try {
      const data = await pdfParse(fileBuffer);
      return data.text;
    } catch (err: any) {
      throw new Error(`Failed to extract text from PDF locally: ${err.message}`);
    }
  } else if (mimeType.startsWith('image/')) {
    try {
      const worker = await Tesseract.recognize(fileBuffer, 'eng');
      return worker.data.text;
    } catch (err: any) {
      throw new Error(`Failed to extract text from image locally using Tesseract: ${err.message}`);
    }
  }

  throw new Error(`Unsupported MIME type for local extraction: ${mimeType}`);
}
