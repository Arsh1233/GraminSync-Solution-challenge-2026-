// WatermelonDB database initialization for offline-first architecture
import { Database } from "@nozbe/watermelondb";
import SQLiteAdapter from "@nozbe/watermelondb/adapters/sqlite";
import { schema } from "../models/schema";
import {
  Survey,
  CommunityNeed,
  Volunteer,
  ImpactToken,
  TaskAssignment,
} from "../models";

const adapter = new SQLiteAdapter({
  schema,
  // Enable WAL mode for better concurrent read/write performance
  jsi: true, // Use JSI for better performance with New Architecture
  onSetUpError: (error) => {
    console.error("WatermelonDB setup error:", error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [Survey, CommunityNeed, Volunteer, ImpactToken, TaskAssignment],
});

export default database;
