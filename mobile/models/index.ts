// WatermelonDB Model definitions for GraminSync
import { Model } from "@nozbe/watermelondb";
import {
  field,
  text,
  date,
  readonly,
  relation,
  json,
} from "@nozbe/watermelondb/decorators";

const sanitizeJSON = (raw: unknown): unknown => {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
  return raw ?? [];
};

export class Survey extends Model {
  static table = "surveys";

  @text("title") title!: string;
  @text("description") description?: string;
  @text("image_uri") imageUri!: string;
  @field("location_lat") locationLat?: number;
  @field("location_lng") locationLng?: number;
  @text("captured_by") capturedBy!: string;
  @text("sync_status") syncStatus!:
    | "pending"
    | "syncing"
    | "synced"
    | "error";
  @text("extracted_text") extractedText?: string;
  @text("language") language?: string;
  @readonly @date("created_at") createdAt!: Date;
  @readonly @date("updated_at") updatedAt!: Date;
}

export class CommunityNeed extends Model {
  static table = "community_needs";

  @text("survey_id") surveyId!: string;
  @text("title") title!: string;
  @text("description") description!: string;
  @json("sdg_tags", sanitizeJSON) sdgTags!: number[];
  @field("vulnerability_score") vulnerabilityScore!: number;
  @field("location_lat") locationLat?: number;
  @field("location_lng") locationLng?: number;
  @text("status") status!: "open" | "assigned" | "in_progress" | "completed";
  @text("assigned_volunteer_id") assignedVolunteerId?: string;
  @readonly @date("created_at") createdAt!: Date;
  @readonly @date("updated_at") updatedAt!: Date;
}

export class Volunteer extends Model {
  static table = "volunteers";

  @text("name") name!: string;
  @text("email") email?: string;
  @text("phone") phone?: string;
  @json("skills", sanitizeJSON) skills!: string[];
  @text("did") did?: string;
  @text("wallet_address") walletAddress?: string;
  @field("total_tasks_completed") totalTasksCompleted!: number;
  @field("burnout_score") burnoutScore!: number;
  @field("availability") availability!: boolean;
  @field("location_lat") locationLat?: number;
  @field("location_lng") locationLng?: number;
  @readonly @date("created_at") createdAt!: Date;
  @readonly @date("updated_at") updatedAt!: Date;
}

export class ImpactToken extends Model {
  static table = "impact_tokens";

  @text("volunteer_id") volunteerId!: string;
  @text("task_id") taskId!: string;
  @text("token_mint") tokenMint?: string;
  @text("sdg_category") sdgCategory!: string;
  @text("impact_description") impactDescription!: string;
  @field("verified") verified!: boolean;
  @field("minted_at") mintedAt?: number;
  @readonly @date("created_at") createdAt!: Date;
  @readonly @date("updated_at") updatedAt!: Date;
}

export class TaskAssignment extends Model {
  static table = "task_assignments";

  @text("need_id") needId!: string;
  @text("volunteer_id") volunteerId!: string;
  @field("similarity_score") similarityScore!: number;
  @text("status") status!:
    | "pending"
    | "accepted"
    | "in_progress"
    | "completed"
    | "rejected";
  @field("started_at") startedAt?: number;
  @field("completed_at") completedAt?: number;
  @readonly @date("created_at") createdAt!: Date;
  @readonly @date("updated_at") updatedAt!: Date;
}
