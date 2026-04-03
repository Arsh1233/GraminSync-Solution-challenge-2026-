// WatermelonDB Schema for GraminSync offline-first architecture
import { appSchema, tableSchema } from "@nozbe/watermelondb";

export const schema = appSchema({
  version: 1,
  tables: [
    // Community surveys captured in the field
    tableSchema({
      name: "surveys",
      columns: [
        { name: "title", type: "string" },
        { name: "description", type: "string", isOptional: true },
        { name: "image_uri", type: "string" },
        { name: "location_lat", type: "number", isOptional: true },
        { name: "location_lng", type: "number", isOptional: true },
        { name: "captured_by", type: "string" },
        { name: "sync_status", type: "string" }, // 'pending' | 'syncing' | 'synced' | 'error'
        { name: "extracted_text", type: "string", isOptional: true },
        { name: "language", type: "string", isOptional: true }, // 'hi' | 'ur' | 'en'
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),

    // Community needs extracted from surveys via AI pipeline
    tableSchema({
      name: "community_needs",
      columns: [
        { name: "survey_id", type: "string" },
        { name: "title", type: "string" },
        { name: "description", type: "string" },
        { name: "sdg_tags", type: "string" }, // JSON array of SDG numbers
        { name: "vulnerability_score", type: "number" },
        { name: "location_lat", type: "number", isOptional: true },
        { name: "location_lng", type: "number", isOptional: true },
        { name: "status", type: "string" }, // 'open' | 'assigned' | 'in_progress' | 'completed'
        { name: "assigned_volunteer_id", type: "string", isOptional: true },
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),

    // Volunteer profiles with skills and DID
    tableSchema({
      name: "volunteers",
      columns: [
        { name: "name", type: "string" },
        { name: "email", type: "string", isOptional: true },
        { name: "phone", type: "string", isOptional: true },
        { name: "skills", type: "string" }, // JSON array of skill strings
        { name: "did", type: "string", isOptional: true }, // W3C Decentralized Identifier
        { name: "wallet_address", type: "string", isOptional: true },
        { name: "total_tasks_completed", type: "number" },
        { name: "burnout_score", type: "number" }, // 0-100, higher = more risk
        { name: "availability", type: "boolean" },
        { name: "location_lat", type: "number", isOptional: true },
        { name: "location_lng", type: "number", isOptional: true },
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),

    // Social Impact Tokens (SITs) - non-transferable NFTs
    tableSchema({
      name: "impact_tokens",
      columns: [
        { name: "volunteer_id", type: "string" },
        { name: "task_id", type: "string" },
        { name: "token_mint", type: "string", isOptional: true }, // Solana mint address
        { name: "sdg_category", type: "string" },
        { name: "impact_description", type: "string" },
        { name: "verified", type: "boolean" },
        { name: "minted_at", type: "number", isOptional: true },
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),

    // Task assignments from optimization engine
    tableSchema({
      name: "task_assignments",
      columns: [
        { name: "need_id", type: "string" },
        { name: "volunteer_id", type: "string" },
        { name: "similarity_score", type: "number" },
        { name: "status", type: "string" }, // 'pending' | 'accepted' | 'in_progress' | 'completed' | 'rejected'
        { name: "started_at", type: "number", isOptional: true },
        { name: "completed_at", type: "number", isOptional: true },
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),
  ],
});
