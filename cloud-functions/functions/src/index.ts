/**
 * GraminSync Cloud Functions - AI Digitization Pipeline
 *
 * Bridges the mobile app and Google Cloud AI services:
 * 1. Receives handwritten survey images from the mobile app
 * 2. Extracts text using Google Cloud Vision API (DOCUMENT_TEXT_DETECTION)
 * 3. Analyzes text using Vertex AI (Gemini 1.5 Flash) for SDG tagging
 * 4. Streams results to BigQuery for CVI heatmap generation
 */
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { processSurveyImage } from "./vision-ocr";
import { analyzeWithGemini } from "./vertex-ai";
import { streamToBigQuery } from "./bigquery-stream";

admin.initializeApp();

const storage = admin.storage();

/**
 * Process a survey image uploaded from the mobile app.
 * This is the main entry point for the AI digitization pipeline.
 */
export const processSurvey = functions
  .runWith({ memory: "1GB", timeoutSeconds: 120 })
  .https.onRequest(async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      const { surveyId, language, latitude, longitude } = req.body as {
        surveyId: string;
        language: string;
        latitude: string;
        longitude: string;
      };

      // Get the uploaded image from the request
      const imageBuffer = await extractImageFromRequest(req);
      if (!imageBuffer) {
        res.status(400).json({ error: "No image provided" });
        return;
      }

      // Store image in Cloud Storage
      const bucket = storage.bucket();
      const imagePath = `surveys/${surveyId}.jpg`;
      const file = bucket.file(imagePath);
      await file.save(imageBuffer, {
        metadata: { contentType: "image/jpeg" },
      });

      // Step 1: Extract text using Cloud Vision API (DOCUMENT_TEXT_DETECTION)
      const extractedText = await processSurveyImage(imageBuffer, language);
      functions.logger.info("OCR completed", {
        surveyId,
        textLength: extractedText.length,
      });

      // Step 2: Analyze with Vertex AI (Gemini 1.5 Flash)
      const analysis = await analyzeWithGemini(extractedText, language);
      functions.logger.info("Gemini analysis completed", {
        surveyId,
        sdgTags: analysis.sdgTags,
        vulnerabilityScore: analysis.vulnerabilityScore,
      });

      // Step 3: Stream to BigQuery for CVI heatmap
      await streamToBigQuery({
        survey_id: surveyId,
        extracted_text: extractedText,
        title: analysis.title,
        description: analysis.description,
        sdg_tags: analysis.sdgTags,
        vulnerability_score: analysis.vulnerabilityScore,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        language,
        processed_at: new Date().toISOString(),
      });

      // Return results to mobile app
      res.status(200).json({
        extractedText,
        communityNeed: {
          title: analysis.title,
          description: analysis.description,
          sdgTags: analysis.sdgTags,
          vulnerabilityScore: analysis.vulnerabilityScore,
        },
      });
    } catch (error) {
      functions.logger.error("Survey processing failed:", error);
      res.status(500).json({
        error: "Processing failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

/**
 * Scheduled function to refresh the CVI heatmap data in BigQuery.
 * Runs every 6 hours to aggregate and compute vulnerability indices.
 */
export const refreshCVIHeatmap = functions.pubsub
  .schedule("every 6 hours")
  .onRun(async () => {
    functions.logger.info("Refreshing CVI heatmap data...");
    // BigQuery aggregation would run here to compute cluster-level CVI
    // This data feeds the Google Maps heatmap in the mobile app
  });

/** Extract image buffer from multipart form data */
async function extractImageFromRequest(
  req: functions.https.Request
): Promise<Buffer | null> {
  return new Promise((resolve, reject) => {
    const Busboy = require("busboy");
    const busboy = Busboy({ headers: req.headers });
    const chunks: Buffer[] = [];

    busboy.on(
      "file",
      (
        _fieldname: string,
        file: NodeJS.ReadableStream,
        _filename: string,
        _encoding: string,
        _mimetype: string
      ) => {
        file.on("data", (data: Buffer) => chunks.push(data));
        file.on("end", () => resolve(Buffer.concat(chunks)));
      }
    );

    busboy.on("error", reject);
    busboy.on("finish", () => {
      if (chunks.length === 0) resolve(null);
    });

    if (req.rawBody) {
      busboy.end(req.rawBody);
    } else {
      req.pipe(busboy);
    }
  });
}
