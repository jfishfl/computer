import { pgTable, text, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Token storage
export const tokenTable = pgTable("tokens", {
  id: integer("id").primaryKey().default(1),
  token: text("token").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTokenSchema = createInsertSchema(tokenTable).omit({ id: true, updatedAt: true });
export type InsertToken = z.infer<typeof insertTokenSchema>;
export type Token = typeof tokenTable.$inferSelect;

// Campaign structure (hardcoded from our creation)
export const CAMPAIGN_ID = "120243697850690683";
export const CAMPAIGN_NAME = "Numerology Blueprint - Static Meta_3-11-26";
export const ACT = "act_670664411827203";

export const AD_SETS = [
  { id: "120243697886800683", name: "Static - Dating Patterns", angle: "same_type", budget: 50, adCount: 3 },
  { id: "120243697887090683", name: "Static - Same Type", angle: "same_type", budget: 50, adCount: 3 },
  { id: "120243697887580683", name: "Static - Therapist", angle: "therapist", budget: 50, adCount: 7 },
  { id: "120243697888890683", name: "Static - 2AM Text", angle: "same_type", budget: 50, adCount: 13 },
  { id: "120243697890530683", name: "Static - Birthday", angle: "ai_oracle", budget: 50, adCount: 11 },
  { id: "120243697893310683", name: "Static - POV", angle: "same_type", budget: 50, adCount: 13 },
  { id: "120243697894680683", name: "Static - Finally Understand", angle: "ai_oracle", budget: 50, adCount: 22 },
];

export const ALL_ADS: { name: string; id: string; adset: string; adsetId: string }[] = [
  { name: "Static - Dating Patterns | Ad image 1", id: "120243699044420683", adset: "Static - Dating Patterns", adsetId: "120243697886800683" },
  { name: "Static - Dating Patterns | Ad Image 2", id: "120243699045180683", adset: "Static - Dating Patterns", adsetId: "120243697886800683" },
  { name: "Static - Dating Patterns | ad-creative-1x1-v1", id: "120243699046150683", adset: "Static - Dating Patterns", adsetId: "120243697886800683" },
  { name: "Static - Same Type | ad-creative-1x1-v1", id: "120243699047390683", adset: "Static - Same Type", adsetId: "120243697887090683" },
  { name: "Static - Same Type | ad-creative-1x1-v2", id: "120243699048090683", adset: "Static - Same Type", adsetId: "120243697887090683" },
  { name: "Static - Same Type | ad-creative-1x1-v3", id: "120243699049330683", adset: "Static - Same Type", adsetId: "120243697887090683" },
  { name: "Static - Therapist | ad-creative-1x1-v1", id: "120243699049930683", adset: "Static - Therapist", adsetId: "120243697887580683" },
  { name: "Static - Therapist | ad-creative-1x1-v2", id: "120243699051200683", adset: "Static - Therapist", adsetId: "120243697887580683" },
  { name: "Static - Therapist | ad-creative-1x1-v4", id: "120243699052260683", adset: "Static - Therapist", adsetId: "120243697887580683" },
  { name: "Static - Therapist | ad-creative-1x1-v5", id: "120243699053040683", adset: "Static - Therapist", adsetId: "120243697887580683" },
  { name: "Static - Therapist | ad-creative-1x1-v6", id: "120243699054260683", adset: "Static - Therapist", adsetId: "120243697887580683" },
  { name: "Static - Therapist | ad-creative-1x1-v7", id: "120243699055290683", adset: "Static - Therapist", adsetId: "120243697887580683" },
  { name: "Static - Therapist | ad-creative-1x1-v1 (1)", id: "120243699056630683", adset: "Static - Therapist", adsetId: "120243697887580683" },
  { name: "Static - 2AM Text | ad-creative-1x1-v1", id: "120243699057720683", adset: "Static - 2AM Text", adsetId: "120243697888890683" },
  { name: "Static - 2AM Text | ad-creative-1x1-v2", id: "120243699059560683", adset: "Static - 2AM Text", adsetId: "120243697888890683" },
  { name: "Static - 2AM Text | ad-creative-1x1-v3", id: "120243699060680683", adset: "Static - 2AM Text", adsetId: "120243697888890683" },
  { name: "Static - 2AM Text | ad-creative-1x1-v4", id: "120243699061900683", adset: "Static - 2AM Text", adsetId: "120243697888890683" },
  { name: "Static - 2AM Text | ad-creative-1x1-v5", id: "120243699062630683", adset: "Static - 2AM Text", adsetId: "120243697888890683" },
  { name: "Static - 2AM Text | ad-creative-1x1-v9", id: "120243699064380683", adset: "Static - 2AM Text", adsetId: "120243697888890683" },
  { name: "Static - 2AM Text | ad-creative-1x1-v10", id: "120243699065920683", adset: "Static - 2AM Text", adsetId: "120243697888890683" },
  { name: "Static - 2AM Text | ad-creative-1x1-v11", id: "120243699066980683", adset: "Static - 2AM Text", adsetId: "120243697888890683" },
  { name: "Static - 2AM Text | ad-creative-4x5-v6", id: "120243699068740683", adset: "Static - 2AM Text", adsetId: "120243697888890683" },
  { name: "Static - 2AM Text | ad-creative-4x5-v7", id: "120243699069370683", adset: "Static - 2AM Text", adsetId: "120243697888890683" },
  { name: "Static - 2AM Text | ad-creative-4x5-v8", id: "120243699071070683", adset: "Static - 2AM Text", adsetId: "120243697888890683" },
  { name: "Static - 2AM Text | ad-creative-4x5-v11", id: "120243699071820683", adset: "Static - 2AM Text", adsetId: "120243697888890683" },
  { name: "Static - 2AM Text | ad-creative-1x1-v1 (1)", id: "120243699073720683", adset: "Static - 2AM Text", adsetId: "120243697888890683" },
  { name: "Static - Birthday | ad-creative-1x1-v8", id: "120243699075670683", adset: "Static - Birthday", adsetId: "120243697890530683" },
  { name: "Static - Birthday | ad-creative-1x1-v9", id: "120243699077220683", adset: "Static - Birthday", adsetId: "120243697890530683" },
  { name: "Static - Birthday | ad-creative-1x1-v10", id: "120243699078270683", adset: "Static - Birthday", adsetId: "120243697890530683" },
  { name: "Static - Birthday | ad-creative-1x1-v11", id: "120243699078990683", adset: "Static - Birthday", adsetId: "120243697890530683" },
  { name: "Static - Birthday | ad-creative-4x5-v1", id: "120243699081310683", adset: "Static - Birthday", adsetId: "120243697890530683" },
  { name: "Static - Birthday | ad-creative-4x5-v2", id: "120243699082520683", adset: "Static - Birthday", adsetId: "120243697890530683" },
  { name: "Static - Birthday | ad-creative-4x5-v3", id: "120243699084140683", adset: "Static - Birthday", adsetId: "120243697890530683" },
  { name: "Static - Birthday | ad-creative-4x5-v4", id: "120243699085860683", adset: "Static - Birthday", adsetId: "120243697890530683" },
  { name: "Static - Birthday | ad-creative-4x5-v5", id: "120243699087270683", adset: "Static - Birthday", adsetId: "120243697890530683" },
  { name: "Static - Birthday | ad-creative-4x5-v6", id: "120243699089340683", adset: "Static - Birthday", adsetId: "120243697890530683" },
  { name: "Static - Birthday | ad-creative-4x5-v7", id: "120243699090640683", adset: "Static - Birthday", adsetId: "120243697890530683" },
  { name: "Static - POV | ad-creative-1x1-v1", id: "120243699091760683", adset: "Static - POV", adsetId: "120243697893310683" },
  { name: "Static - POV | ad-creative-1x1-v5", id: "120243699093830683", adset: "Static - POV", adsetId: "120243697893310683" },
  { name: "Static - POV | ad-creative-1x1-v6", id: "120243699095550683", adset: "Static - POV", adsetId: "120243697893310683" },
  { name: "Static - POV | ad-creative-1x1-v7", id: "120243699097030683", adset: "Static - POV", adsetId: "120243697893310683" },
  { name: "Static - POV | ad-creative-1x1-v8", id: "120243699098830683", adset: "Static - POV", adsetId: "120243697893310683" },
  { name: "Static - POV | ad-creative-4x5-v2", id: "120243699100330683", adset: "Static - POV", adsetId: "120243697893310683" },
  { name: "Static - POV | ad-creative-4x5-v3", id: "120243699101570683", adset: "Static - POV", adsetId: "120243697893310683" },
  { name: "Static - POV | ad-creative-4x5-v4", id: "120243699103020683", adset: "Static - POV", adsetId: "120243697893310683" },
  { name: "Static - POV | ad-creative-4x5-v9", id: "120243699103800683", adset: "Static - POV", adsetId: "120243697893310683" },
  { name: "Static - POV | ad-creative-4x5-v10", id: "120243699105620683", adset: "Static - POV", adsetId: "120243697893310683" },
  { name: "Static - POV | ad-creative-4x5-v11", id: "120243699107620683", adset: "Static - POV", adsetId: "120243697893310683" },
  { name: "Static - POV | ad-creative-4x5-v12", id: "120243699108440683", adset: "Static - POV", adsetId: "120243697893310683" },
  { name: "Static - POV | ad-creative-4x5-v13", id: "120243699109590683", adset: "Static - POV", adsetId: "120243697893310683" },
  { name: "Static - Finally Understand | ad-creative-4x5-v1", id: "120243699110730683", adset: "Static - Finally Understand", adsetId: "120243697894680683" },
  { name: "Static - Finally Understand | ad-creative-4x5-v3", id: "120243699112190683", adset: "Static - Finally Understand", adsetId: "120243697894680683" },
  { name: "Static - Finally Understand | ad-creative-4x5-v4", id: "120243699112710683", adset: "Static - Finally Understand", adsetId: "120243697894680683" },
  { name: "Static - Finally Understand | ad-creative-4x5-v6", id: "120243699115040683", adset: "Static - Finally Understand", adsetId: "120243697894680683" },
  { name: "Static - Finally Understand | ad-creative-4x5-v7", id: "120243699115930683", adset: "Static - Finally Understand", adsetId: "120243697894680683" },
  { name: "Static - Finally Understand | ad-creative-4x5-v8", id: "120243699116960683", adset: "Static - Finally Understand", adsetId: "120243697894680683" },
  { name: "Static - Finally Understand | ad-creative-4x5-v9", id: "120243699117830683", adset: "Static - Finally Understand", adsetId: "120243697894680683" },
  { name: "Static - Finally Understand | ad-creative-4x5-v11", id: "120243699119300683", adset: "Static - Finally Understand", adsetId: "120243697894680683" },
  { name: "Static - Finally Understand | ad-creative-4x5-v12", id: "120243699120260683", adset: "Static - Finally Understand", adsetId: "120243697894680683" },
  { name: "Static - Finally Understand | ad-creative-4x5-v13", id: "120243699121700683", adset: "Static - Finally Understand", adsetId: "120243697894680683" },
  { name: "Static - Finally Understand | ad-creative-4x5-v14", id: "120243699122970683", adset: "Static - Finally Understand", adsetId: "120243697894680683" },
  { name: "Static - Finally Understand | ad-creative-4x5-v15", id: "120243699124270683", adset: "Static - Finally Understand", adsetId: "120243697894680683" },
  { name: "Static - Finally Understand | ad-creative-4x5-v16", id: "120243699125370683", adset: "Static - Finally Understand", adsetId: "120243697894680683" },
  { name: "Static - Finally Understand | ad-creative-4x5-v17", id: "120243699125850683", adset: "Static - Finally Understand", adsetId: "120243697894680683" },
  { name: "Static - Finally Understand | ad-creative-4x5-v18", id: "120243699127790683", adset: "Static - Finally Understand", adsetId: "120243697894680683" },
  { name: "Static - Finally Understand | ad-creative-4x5-v19", id: "120243699128640683", adset: "Static - Finally Understand", adsetId: "120243697894680683" },
  { name: "Static - Finally Understand | ad-creative-4x5-v20", id: "120243699130090683", adset: "Static - Finally Understand", adsetId: "120243697894680683" },
  { name: "Static - Finally Understand | ad-creative-4x5-v21", id: "120243699132080683", adset: "Static - Finally Understand", adsetId: "120243697894680683" },
  { name: "Static - Finally Understand | ad-creative-4x5-v22", id: "120243699132950683", adset: "Static - Finally Understand", adsetId: "120243697894680683" },
  { name: "Static - Finally Understand | ad-creative-9x16-v2", id: "120243699133980683", adset: "Static - Finally Understand", adsetId: "120243697894680683" },
  { name: "Static - Finally Understand | ad-creative-9x16-v5", id: "120243699135340683", adset: "Static - Finally Understand", adsetId: "120243697894680683" },
  { name: "Static - Finally Understand | ad-creative-9x16-v10", id: "120243699136320683", adset: "Static - Finally Understand", adsetId: "120243697894680683" },
];

// ── Multi-account config ───────────────────────────────────────────────────────
export interface AccountConfig {
  id: string;           // slug used in URL path and API param
  name: string;         // display name
  act: string;          // Meta ad account ID (act_XXXXXX)
  pageId?: string;      // Facebook page ID
  tokenFile: string;    // filename for token persistence
  cachePrefix: string;  // prefix for disk cache keys to isolate namespaces
  redtrackKey?: string; // RedTrack API key (if different per account)
  hasCrm: boolean;      // whether Railway DB / CRM data is available
  color: string;        // accent hue for branding (HSL hue value)
  description: string;  // short label shown in UI
}

export const ACCOUNTS: Record<string, AccountConfig> = {
  numerology: {
    id: "numerology",
    name: "Numerology Blueprint",
    act: "act_670664411827203",
    pageId: "61580590181403",
    tokenFile: ".token",
    cachePrefix: "num",
    redtrackKey: "O9jnONlm9lhcWNNQh1X5",
    hasCrm: true,
    color: "38",   // amber/gold
    description: "Numerology Blueprint · Meta Ads",
  },
  proverb: {
    id: "proverb",
    name: "Proverb",
    act: "act_3384275714995178",
    tokenFile: ".token_proverb",
    cachePrefix: "prv",
    hasCrm: false,
    color: "199",  // cyan/teal — distinct from numerology gold
    description: "Proverb · Meta Ads",
  },
};

export const DEFAULT_ACCOUNT = "numerology";
