/**
 * BigQuery streaming integration for Community Vulnerability Index (CVI).
 * Streams processed survey data to BigQuery for real-time heatmap generation.
 */
import { BigQuery } from "@google-cloud/bigquery";

const bigquery = new BigQuery();
const DATASET_ID = "graminsync";
const TABLE_ID = "community_needs";

interface CommunityNeedRow {
  survey_id: string;
  extracted_text: string;
  title: string;
  description: string;
  sdg_tags: number[];
  vulnerability_score: number;
  latitude: number;
  longitude: number;
  language: string;
  processed_at: string;
}

/**
 * Stream a processed community need record to BigQuery.
 * This feeds the CVI heatmap visualization in the mobile app.
 */
export async function streamToBigQuery(row: CommunityNeedRow): Promise<void> {
  try {
    // Ensure dataset and table exist
    await ensureTableExists();

    // Insert the row using streaming insert for real-time availability
    await bigquery
      .dataset(DATASET_ID)
      .table(TABLE_ID)
      .insert([
        {
          ...row,
          sdg_tags: JSON.stringify(row.sdg_tags),
        },
      ]);
  } catch (error) {
    console.error("BigQuery streaming insert failed:", error);
    throw error;
  }
}

/**
 * Ensure the BigQuery dataset and table exist with the correct schema.
 */
async function ensureTableExists(): Promise<void> {
  const dataset = bigquery.dataset(DATASET_ID);
  const [datasetExists] = await dataset.exists();
  if (!datasetExists) {
    await dataset.create({ location: "US" });
  }

  const table = dataset.table(TABLE_ID);
  const [tableExists] = await table.exists();
  if (!tableExists) {
    await table.create({
      schema: {
        fields: [
          { name: "survey_id", type: "STRING", mode: "REQUIRED" },
          { name: "extracted_text", type: "STRING" },
          { name: "title", type: "STRING", mode: "REQUIRED" },
          { name: "description", type: "STRING" },
          { name: "sdg_tags", type: "STRING" }, // JSON array stored as string
          { name: "vulnerability_score", type: "FLOAT", mode: "REQUIRED" },
          { name: "latitude", type: "FLOAT" },
          { name: "longitude", type: "FLOAT" },
          { name: "language", type: "STRING" },
          { name: "processed_at", type: "TIMESTAMP", mode: "REQUIRED" },
        ],
      },
    });
  }
}

/**
 * Query BigQuery to get aggregated CVI data for the heatmap.
 * Groups community needs by geographic clusters and computes
 * weighted vulnerability scores.
 */
export async function getCVIHeatmapData(): Promise<
  Array<{
    latitude: number;
    longitude: number;
    cvi_score: number;
    total_needs: number;
    top_sdgs: number[];
  }>
> {
  const query = `
    SELECT
      ROUND(latitude, 2) as latitude,
      ROUND(longitude, 2) as longitude,
      AVG(vulnerability_score) as cvi_score,
      COUNT(*) as total_needs,
      ARRAY_AGG(DISTINCT sdg_tag IGNORE NULLS ORDER BY sdg_tag LIMIT 5) as top_sdgs
    FROM \`${DATASET_ID}.${TABLE_ID}\`,
    UNNEST(JSON_EXTRACT_ARRAY(sdg_tags)) as sdg_tag
    WHERE processed_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
    GROUP BY latitude, longitude
    HAVING total_needs > 0
    ORDER BY cvi_score DESC
  `;

  const [rows] = await bigquery.query({ query });
  return rows as Array<{
    latitude: number;
    longitude: number;
    cvi_score: number;
    total_needs: number;
    top_sdgs: number[];
  }>;
}
