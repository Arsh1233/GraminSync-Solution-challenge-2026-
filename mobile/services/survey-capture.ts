// Survey capture service using Expo Camera and FileSystem
// Handles image capture, local storage, and metadata tagging
import * as FileSystem from "expo-file-system";
import * as Location from "expo-location";
import { database } from "../lib/database";
import { Survey } from "../models";
import { v4 as uuidv4 } from "uuid";

const SURVEY_DIR = `${FileSystem.documentDirectory}surveys/`;

/** Ensure the surveys directory exists */
async function ensureSurveyDir(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(SURVEY_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(SURVEY_DIR, { intermediates: true });
  }
}

/** Capture location for geo-tagging surveys */
async function getCurrentLocation(): Promise<{
  latitude: number;
  longitude: number;
} | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return null;

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch {
    console.warn("Could not get location");
    return null;
  }
}

export interface SurveyCaptureResult {
  surveyId: string;
  localUri: string;
  syncStatus: string;
}

/**
 * Save a captured survey image locally and create a WatermelonDB record.
 * Works fully offline - the sync engine will upload when connectivity returns.
 */
export async function saveSurvey(
  imageUri: string,
  title: string,
  capturedBy: string,
  language: string = "hi"
): Promise<SurveyCaptureResult> {
  await ensureSurveyDir();

  // Copy image to persistent local storage
  const filename = `survey_${uuidv4()}.jpg`;
  const localUri = `${SURVEY_DIR}${filename}`;
  await FileSystem.copyAsync({ from: imageUri, to: localUri });

  // Get location for geo-tagging
  const location = await getCurrentLocation();

  // Create WatermelonDB record with 'pending' sync status
  let surveyId = "";
  await database.write(async () => {
    const survey = await database.get<Survey>("surveys").create((s) => {
      s.title = title;
      s.imageUri = localUri;
      s.capturedBy = capturedBy;
      s.syncStatus = "pending";
      s.language = language;
      if (location) {
        s.locationLat = location.latitude;
        s.locationLng = location.longitude;
      }
    });
    surveyId = survey.id;
  });

  return {
    surveyId,
    localUri,
    syncStatus: "pending",
  };
}

/** Get count of pending surveys (for UI badge) */
export async function getPendingSurveyCount(): Promise<number> {
  const surveys = await database
    .get<Survey>("surveys")
    .query()
    .fetch();
  return surveys.filter((s) => s.syncStatus === "pending").length;
}

/** Delete a locally stored survey and its image */
export async function deleteSurvey(surveyId: string): Promise<void> {
  const survey = await database.get<Survey>("surveys").find(surveyId);
  const imageUri = survey.imageUri;

  await database.write(async () => {
    await survey.markAsDeleted();
  });

  // Clean up the local image file
  const fileInfo = await FileSystem.getInfoAsync(imageUri);
  if (fileInfo.exists) {
    await FileSystem.deleteAsync(imageUri);
  }
}
