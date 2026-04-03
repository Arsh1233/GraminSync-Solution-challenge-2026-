/**
 * Google Cloud Vision API integration for handwritten text extraction.
 * Uses DOCUMENT_TEXT_DETECTION endpoint optimized for dense handwritten
 * Hindi/Urdu text from field survey images.
 */
import vision from "@google-cloud/vision";

const client = new vision.ImageAnnotatorClient();

/**
 * Extract text from a survey image using DOCUMENT_TEXT_DETECTION.
 * This endpoint is specifically designed for dense, handwritten documents
 * and supports Hindi (Devanagari) and Urdu (Nastaliq) scripts.
 */
export async function processSurveyImage(
  imageBuffer: Buffer,
  language: string
): Promise<string> {
  // Use DOCUMENT_TEXT_DETECTION for dense handwritten text
  const [result] = await client.documentTextDetection({
    image: { content: imageBuffer.toString("base64") },
    imageContext: {
      languageHints: getLanguageHints(language),
    },
  });

  const fullTextAnnotation = result.fullTextAnnotation;
  if (!fullTextAnnotation?.text) {
    throw new Error("No text could be extracted from the survey image");
  }

  return fullTextAnnotation.text;
}

/**
 * Map language codes to Cloud Vision language hints.
 * This helps the OCR engine optimize for the expected script.
 */
function getLanguageHints(language: string): string[] {
  switch (language) {
    case "hi":
      return ["hi", "en"]; // Hindi + English (common in Indian surveys)
    case "ur":
      return ["ur", "en"]; // Urdu + English
    case "en":
      return ["en"];
    default:
      return ["hi", "en"]; // Default to Hindi + English
  }
}
