// Network-aware sync engine for WatermelonDB
// Monitors connectivity via NetInfo and syncs pending surveys when online
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import { database } from "../lib/database";
import { Survey } from "../models";
import { Q } from "@nozbe/watermelondb";
import * as FileSystem from "expo-file-system";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "https://graminsync-api.run.app";
const CLOUD_FUNCTION_URL =
  process.env.EXPO_PUBLIC_CLOUD_FUNCTION_URL ??
  "https://us-central1-graminsync.cloudfunctions.net";

type SyncListener = (isConnected: boolean) => void;

interface ProcessSurveyResponse {
  extractedText: string;
  communityNeed: {
    title: string;
    description: string;
    sdgTags: number[];
    vulnerabilityScore: number;
  };
}

class SyncEngine {
  private isConnected = false;
  private isSyncing = false;
  private listeners: SyncListener[] = [];
  private unsubscribeNetInfo: (() => void) | null = null;

  /** Start listening for network changes and trigger sync when online */
  start(): void {
    this.unsubscribeNetInfo = NetInfo.addEventListener(
      (state: NetInfoState) => {
        const wasConnected = this.isConnected;
        this.isConnected = state.isConnected ?? false;

        this.listeners.forEach((listener) => listener(this.isConnected));

        // Trigger sync when we regain connectivity
        if (!wasConnected && this.isConnected) {
          this.syncPendingSurveys().catch(console.error);
        }
      }
    );
  }

  /** Stop listening for network changes */
  stop(): void {
    this.unsubscribeNetInfo?.();
    this.unsubscribeNetInfo = null;
  }

  /** Register a listener for connectivity changes */
  onConnectivityChange(listener: SyncListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /** Get current connectivity status */
  getIsConnected(): boolean {
    return this.isConnected;
  }

  /** Sync all pending surveys to the cloud */
  async syncPendingSurveys(): Promise<void> {
    if (this.isSyncing || !this.isConnected) return;

    this.isSyncing = true;
    try {
      const surveysCollection = database.get<Survey>("surveys");
      const pendingSurveys = await surveysCollection
        .query(Q.where("sync_status", "pending"))
        .fetch();

      for (const survey of pendingSurveys) {
        await this.syncSingleSurvey(survey);
      }
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      this.isSyncing = false;
    }
  }

  /** Sync a single survey: upload image, trigger OCR, update status */
  private async syncSingleSurvey(survey: Survey): Promise<void> {
    try {
      // Mark as syncing
      await database.write(async () => {
        await survey.update((s) => {
          s.syncStatus = "syncing";
        });
      });

      // Upload the survey image to Cloud Storage via Cloud Function
      const uploadResult = await FileSystem.uploadAsync(
        `${CLOUD_FUNCTION_URL}/processSurvey`,
        survey.imageUri,
        {
          fieldName: "image",
          httpMethod: "POST",
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          parameters: {
            surveyId: survey.id,
            language: survey.language ?? "hi",
            latitude: String(survey.locationLat ?? 0),
            longitude: String(survey.locationLng ?? 0),
          },
        }
      );

      if (uploadResult.status !== 200) {
        throw new Error(
          `Upload failed with status ${uploadResult.status}: ${uploadResult.body}`
        );
      }

      const response: ProcessSurveyResponse = JSON.parse(uploadResult.body);

      // Update survey with extracted text and mark as synced
      await database.write(async () => {
        await survey.update((s) => {
          s.syncStatus = "synced";
          s.extractedText = response.extractedText;
        });

        // Create the community need record from AI analysis
        const needsCollection = database.get("community_needs");
        await needsCollection.create((need: Record<string, unknown>) => {
          need.survey_id = survey.id;
          need.title = response.communityNeed.title;
          need.description = response.communityNeed.description;
          need.sdg_tags = JSON.stringify(response.communityNeed.sdgTags);
          need.vulnerability_score = response.communityNeed.vulnerabilityScore;
          need.location_lat = survey.locationLat;
          need.location_lng = survey.locationLng;
          need.status = "open";
        });
      });
    } catch (error) {
      console.error(`Failed to sync survey ${survey.id}:`, error);
      await database.write(async () => {
        await survey.update((s) => {
          s.syncStatus = "error";
        });
      });
    }
  }

  /** Trigger the optimization engine to match volunteers with needs */
  async requestVolunteerMatching(needId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/v1/match`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ need_id: needId }),
    });

    if (!response.ok) {
      throw new Error(`Matching request failed: ${response.statusText}`);
    }
  }
}

export const syncEngine = new SyncEngine();
export default syncEngine;
