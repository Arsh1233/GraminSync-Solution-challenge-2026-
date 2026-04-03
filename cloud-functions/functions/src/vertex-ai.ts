/**
 * Vertex AI (Gemini 1.5 Flash) integration for intelligent analysis.
 * Analyzes extracted survey text to:
 * 1. Generate structured title and description
 * 2. Tag with relevant UN Sustainable Development Goals (SDGs)
 * 3. Calculate a Vulnerability Score (0-100)
 */
import { VertexAI } from "@google-cloud/aiplatform";

const PROJECT_ID = process.env.GCLOUD_PROJECT ?? "graminsync-2026";
const LOCATION = "us-central1";

const vertexAI = new VertexAI({ project: PROJECT_ID, location: LOCATION });

interface GeminiAnalysisResult {
  title: string;
  description: string;
  sdgTags: number[];
  vulnerabilityScore: number;
}

/**
 * Analyze extracted survey text using Gemini 1.5 Flash.
 * The model tags the content with SDGs and assigns a vulnerability score.
 */
export async function analyzeWithGemini(
  extractedText: string,
  language: string
): Promise<GeminiAnalysisResult> {
  const generativeModel = vertexAI.getGenerativeModel({
    model: "gemini-1.5-flash",
  });

  const prompt = buildAnalysisPrompt(extractedText, language);

  const result = await generativeModel.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2, // Low temperature for consistent, factual output
      topP: 0.8,
      maxOutputTokens: 1024,
      responseMimeType: "application/json",
    },
  });

  const responseText =
    result.response?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!responseText) {
    throw new Error("No response from Gemini model");
  }

  const parsed = JSON.parse(responseText) as GeminiAnalysisResult;

  // Validate and clamp vulnerability score
  parsed.vulnerabilityScore = Math.max(
    0,
    Math.min(100, parsed.vulnerabilityScore)
  );

  // Validate SDG tags (1-17)
  parsed.sdgTags = parsed.sdgTags.filter((tag) => tag >= 1 && tag <= 17);

  return parsed;
}

/**
 * Build the analysis prompt for Gemini.
 * The prompt instructs the model to extract structured information
 * and map community needs to UN SDGs.
 */
function buildAnalysisPrompt(text: string, language: string): string {
  return `You are an expert analyst for community development in rural India (Chhattisgarh region).
Analyze the following extracted text from a handwritten community survey.

The text was written in ${language === "hi" ? "Hindi" : language === "ur" ? "Urdu" : "English"} and may contain mixed-language content.

EXTRACTED SURVEY TEXT:
---
${text}
---

Analyze this survey and return a JSON object with the following structure:
{
  "title": "A concise title summarizing the main community need (in English, max 100 chars)",
  "description": "A detailed description of the community need, context, and urgency (in English, 200-500 chars)",
  "sdgTags": [array of relevant UN SDG numbers (1-17)],
  "vulnerabilityScore": number between 0-100 indicating urgency (100 = most critical)
}

SDG Reference:
1-No Poverty, 2-Zero Hunger, 3-Good Health, 4-Quality Education,
5-Gender Equality, 6-Clean Water, 7-Clean Energy, 8-Decent Work,
9-Infrastructure, 10-Reduced Inequalities, 11-Sustainable Cities,
12-Responsible Consumption, 13-Climate Action, 14-Life Below Water,
15-Life on Land, 16-Peace & Justice, 17-Partnerships

Vulnerability Score Guidelines:
- 90-100: Life-threatening emergency (disease outbreak, famine, flooding)
- 70-89: Critical infrastructure failure (no water, no electricity, collapsed school)
- 50-69: Significant hardship (unemployment, food insecurity, healthcare access)
- 30-49: Moderate need (education gaps, sanitation issues)
- 0-29: Improvement opportunity (skill training, community development)

Return ONLY the JSON object, no other text.`;
}
