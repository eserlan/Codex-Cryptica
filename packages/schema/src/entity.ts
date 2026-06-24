import { z } from "zod";
import { ConnectionSchema } from "./connection";

export const DEFAULT_ICON = "lucide:circle";

export const CategorySchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color"),
  icon: z.string().default(DEFAULT_ICON),
});

export type Category = z.infer<typeof CategorySchema>;

export const DatePrecisionSchema = z.enum(["year", "unit", "day", "anchor"]);

export const DateSelectionSchema = z
  .object({
    precision: DatePrecisionSchema,
    year: z.number().int(),
    unitId: z.string().optional(),
    day: z.number().int().optional(),
    anchorId: z.string().optional(),
    label: z.string().optional(),
    calendarRevision: z.number().int().min(1),
  })
  .superRefine((data, ctx) => {
    if (data.precision === "unit" && !data.unitId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "unitId is required when precision is 'unit'",
        path: ["unitId"],
      });
    }
    if (data.precision === "day") {
      if (!data.unitId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "unitId is required when precision is 'day'",
          path: ["unitId"],
        });
      }
      if (data.day === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "day is required when precision is 'day'",
          path: ["day"],
        });
      }
    }
    if (data.precision === "anchor" && !data.anchorId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "anchorId is required when precision is 'anchor'",
        path: ["anchorId"],
      });
    }
  });

export const LegacyTemporalMetadataSchema = z.object({
  year: z.number(),
  month: z.number().min(1).max(12).optional(),
  day: z.number().min(1).max(31).optional(),
  label: z.string().optional(),
});

export const TemporalMetadataSchema = z.union([
  DateSelectionSchema,
  LegacyTemporalMetadataSchema,
]);

export type TemporalMetadata = z.infer<typeof TemporalMetadataSchema>;

export const EraSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  start_year: z.number(),
  end_year: z.number().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color")
    .optional(),
});

export type Era = z.infer<typeof EraSchema>;

export const EntityTypeSchema = z.string();

export const SoundBiteSchema = z.object({
  transcript: z.string(),
  audioFile: z.string().optional(), // vault-relative path e.g. "audio/{id}_soundbite.wav"
  audioData: z.string().optional(), // legacy base64 fallback
  voiceMode: z.enum(["entity", "scholar"]),
  scholarName: z.string().optional(),
  scholarTitle: z.string().optional(),
  voiceProfile: z
    .object({
      gender: z.enum(["male", "female", "neutral"]),
      ageRange: z.enum(["child", "young-adult", "middle-aged", "elder"]),
      accent: z.string().nullable().optional(),
      tone: z.string(),
    })
    .optional(),
  generatedAt: z.number().optional(),
});

export type SoundBite = z.infer<typeof SoundBiteSchema>;

export const GuestChatConfigSchema = z.object({
  isEnabled: z.boolean().default(false),
  contextScope: z.enum(["public", "hybrid"]).default("public"),
  extraInstructions: z.string().optional(),
  isHostReviewable: z.boolean().default(true),
  keepMemory: z.boolean().default(true),
});

export type GuestChatConfig = z.infer<typeof GuestChatConfigSchema>;

export const GuestChatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  timestamp: z.number(),
});

export const GuestChatTranscriptSchema = z.object({
  id: z.string(),
  guestId: z.string(),
  guestName: z.string(),
  characterId: z.string(),
  characterTitle: z.string(),
  messages: z.array(GuestChatMessageSchema),
  lastUpdated: z.number(),
});

export type GuestChatMessage = z.infer<typeof GuestChatMessageSchema>;
export type GuestChatTranscript = z.infer<typeof GuestChatTranscriptSchema>;

export const EntitySchema = z.object({
  id: z.string().min(1),
  type: EntityTypeSchema,
  title: z.string().min(1),
  tags: z.array(z.string()).default([]),
  labels: z.array(z.string()).default([]),
  aliases: z.array(z.string().trim().min(1)).default([]),
  connections: z.array(ConnectionSchema).default([]),

  content: z.string().default(""), // Markdown content, default empty
  lore: z.string().optional(), // Extended lore & rich notes
  artDirection: z.string().optional(),
  image: z.string().optional(),
  thumbnail: z.string().optional(),
  date: TemporalMetadataSchema.optional(),
  start_date: TemporalMetadataSchema.optional(),
  end_date: TemporalMetadataSchema.optional(),
  metadata: z
    .object({
      coordinates: z.object({ x: z.number(), y: z.number() }).optional(),
      width: z.number().optional(),
      height: z.number().optional(),
    })
    .optional(),
  status: z.enum(["active", "draft"]).optional().default("active"),
  discoverySource: z.string().optional(),
  lastUpdated: z.number().optional(),
  updatedAt: z.number().optional(),
  // Epoch ms. createdAt is set once at creation and preserved across edits;
  // modifiedAt is refreshed on every mutation (kept alongside updatedAt, which
  // remains the load-bearing field for sync scanning).
  createdAt: z.number().optional(),
  modifiedAt: z.number().optional(),
  _path: z.union([z.string(), z.array(z.string())]).optional(),
  parent: z.string().optional(),
  soundBite: SoundBiteSchema.optional(),
  guestChatConfig: GuestChatConfigSchema.optional(),
  visibility: z.enum(["visible", "hidden"]).optional(),
});

export type Entity = z.infer<typeof EntitySchema>;
export type EntityType = z.infer<typeof EntityTypeSchema>;

export const DEFAULT_ENTITY_TYPE = "note";

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: "character",
    label: "Character",
    color: "#60a5fa",
    icon: "lucide:user",
  },
  {
    id: "creature",
    label: "Creature",
    color: "#f87171",
    icon: "lucide:paw-print",
  },
  {
    id: "location",
    label: "Location",
    color: "#4ade80",
    icon: "lucide:map-pin",
  },
  { id: "item", label: "Item", color: "#facc15", icon: "lucide:package" },
  { id: "event", label: "Event", color: "#e879f9", icon: "lucide:calendar" },
  { id: "faction", label: "Faction", color: "#fb923c", icon: "lucide:users" },
  { id: "note", label: "Note", color: "#94a3b8", icon: "lucide:file-text" },
];
