import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { CAMPAIGN_ID, AD_SETS, ALL_ADS, ACT } from "@shared/schema";

// International campaign constants
const INTL_CAMPAIGN_ID = "120243735394910683";
const INTL_AD_SETS = [
  { id: "120243735434580683", name: "Intl - Spanish",   language: "Spanish",    langCode: "es", countries: ["MX","CO","AR","CL","PE","EC","BO","PY","UY","DO","GT","HN","SV","NI","CR","PA","VE"] },
  { id: "120243735446470683", name: "Intl - Portuguese", language: "Portuguese", langCode: "pt", countries: ["BR","PT","AO","MZ"] },
  { id: "120243735467560683", name: "Intl - French",     language: "French",     langCode: "fr", countries: ["FR","BE","CH","CA","SN","CI","CM","MA"] },
  { id: "120243735467870683", name: "Intl - German",     language: "German",     langCode: "de", countries: ["DE","AT","CH"] },
  { id: "120243735468280683", name: "Intl - Italian",    language: "Italian",    langCode: "it", countries: ["IT","CH"] },
  { id: "120243735468570683", name: "Intl - English",    language: "English",    langCode: "en", countries: ["GB","CA","AU","NZ","IE","ZA"] },
  { id: "120243735632150683", name: "Intl - Broad (DLO)",language: "Multi",      langCode: "multi", countries: ["GB","DE","FR","IT","ES","PT","NL","BE","CH","AT","SE","NO","DK","FI","PL","CZ","HU","RO","GR","IE","RS","HR","SK","BG","LT","LV","EE","CA","MX","BR","AR","CL","CO","PE","EC","DO","GT","CR","PA","AU","NZ","JP","KR","SG","MY","TH","PH","ID","HK","IN","TW","AE","ZA","MA"] },
];

// Country → language mapping (best-match for display)
const COUNTRY_LANG_MAP: Record<string, string> = {
  MX:"Spanish",CO:"Spanish",AR:"Spanish",CL:"Spanish",PE:"Spanish",EC:"Spanish",BO:"Spanish",PY:"Spanish",UY:"Spanish",DO:"Spanish",GT:"Spanish",HN:"Spanish",SV:"Spanish",NI:"Spanish",CR:"Spanish",PA:"Spanish",VE:"Spanish",ES:"Spanish",
  BR:"Portuguese",PT:"Portuguese",AO:"Portuguese",MZ:"Portuguese",
  FR:"French",SN:"French",CI:"French",CM:"French",MA:"French",
  DE:"German",AT:"German",
  IT:"Italian",
  GB:"English",CA:"English",AU:"English",NZ:"English",IE:"English",ZA:"English",
  BE:"French",CH:"German",NL:"Dutch",
  SE:"Swedish",NO:"Norwegian",DK:"Danish",FI:"Finnish",PL:"Polish",CZ:"Czech",HU:"Hungarian",RO:"Romanian",GR:"Greek",RS:"Serbian",HR:"Croatian",SK:"Slovak",BG:"Bulgarian",LT:"Lithuanian",LV:"Latvian",EE:"Estonian",
  JP:"Japanese",KR:"Korean",SG:"English",MY:"Malay",TH:"Thai",PH:"Filipino",ID:"Indonesian",HK:"Chinese",IN:"Hindi",TW:"Chinese",AE:"Arabic",
};

const COUNTRY_NAMES: Record<string, string> = {
  MX:"Mexico",CO:"Colombia",AR:"Argentina",CL:"Chile",PE:"Peru",EC:"Ecuador",BO:"Bolivia",PY:"Paraguay",UY:"Uruguay",DO:"Dominican Republic",GT:"Guatemala",HN:"Honduras",SV:"El Salvador",NI:"Nicaragua",CR:"Costa Rica",PA:"Panama",VE:"Venezuela",ES:"Spain",
  BR:"Brazil",PT:"Portugal",AO:"Angola",MZ:"Mozambique",
  FR:"France",SN:"Senegal",CI:"Ivory Coast",CM:"Cameroon",MA:"Morocco",
  DE:"Germany",AT:"Austria",CH:"Switzerland",
  IT:"Italy",
  GB:"United Kingdom",CA:"Canada",AU:"Australia",NZ:"New Zealand",IE:"Ireland",ZA:"South Africa",
  BE:"Belgium",NL:"Netherlands",
  SE:"Sweden",NO:"Norway",DK:"Denmark",FI:"Finland",PL:"Poland",CZ:"Czech Republic",HU:"Hungary",RO:"Romania",GR:"Greece",RS:"Serbia",HR:"Croatia",SK:"Slovakia",BG:"Bulgaria",LT:"Lithuania",LV:"Latvia",EE:"Estonia",
  JP:"Japan",KR:"South Korea",SG:"Singapore",MY:"Malaysia",TH:"Thailand",PH:"Philippines",ID:"Indonesia",HK:"Hong Kong",IN:"India",TW:"Taiwan",AE:"UAE",
  US:"United States",
};

const META_BASE = "https://graph.facebook.com/v19.0";
const INSIGHTS_FIELDS = "impressions,clicks,spend,ctr,cpc,cpm,reach,frequency,actions,cost_per_action_type,unique_clicks,unique_ctr";

async function fetchMeta(path: string, token: string, params: Record<string, string> = {}) {
  const url = new URL(`${META_BASE}/${path}`);
  url.searchParams.set("access_token", token);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  return res.json();
}

function parseInsights(raw: any) {
  if (!raw?.data?.[0]) return null;
  const d = raw.data[0];
  const actions = d.actions || [];
  const cpa = d.cost_per_action_type || [];

  const purchases = actions.find((a: any) => a.action_type === "offsite_conversion.fb_pixel_purchase")?.value || 0;
  const leads = actions.find((a: any) => a.action_type === "lead")?.value || 0;
  const landingViews = actions.find((a: any) => a.action_type === "landing_page_view")?.value || 0;
  const costPerPurchase = cpa.find((a: any) => a.action_type === "offsite_conversion.fb_pixel_purchase")?.value || null;

  return {
    impressions: parseInt(d.impressions || "0"),
    clicks: parseInt(d.clicks || "0"),
    spend: parseFloat(d.spend || "0"),
    ctr: parseFloat(d.ctr || "0"),
    cpc: parseFloat(d.cpc || "0"),
    cpm: parseFloat(d.cpm || "0"),
    reach: parseInt(d.reach || "0"),
    frequency: parseFloat(d.frequency || "0"),
    purchases: parseInt(purchases),
    leads: parseInt(leads),
    landingViews: parseInt(landingViews),
    costPerPurchase: costPerPurchase ? parseFloat(costPerPurchase) : null,
    roas: purchases > 0 && d.spend ? (parseInt(purchases) * 37) / parseFloat(d.spend) : null,
  };
}

// ─── Performance Analysis Engine ────────────────────────────────────────────
// Benchmarks for Facebook Ads (direct response / ecom)
const BENCHMARKS = {
  ctr: { poor: 0.5, ok: 1.0, good: 2.0 },        // %
  cpc: { good: 0.8, ok: 1.5, poor: 2.5 },         // $ (lower=better)
  cpm: { good: 10, ok: 20, poor: 35 },             // $ (lower=better)
  frequency: { good: 1.5, ok: 2.5, warn: 3.5 },   // higher triggers fatigue
  cpa: { good: 25, ok: 40, poor: 60 },             // $ (lower=better)
  convRate: { poor: 0.5, ok: 1.5, good: 3.0 },    // clicks→purchase %
};

type Severity = "critical" | "warning" | "opportunity" | "good";
type FunnelStage = "awareness" | "interest" | "consideration" | "conversion";
type Priority = "high" | "medium" | "low";

interface Recommendation {
  id: string;
  title: string;
  detail: string;
  severity: Severity;
  stage: FunnelStage;
  priority: Priority;
  effort: "low" | "medium" | "high";
  impact: "low" | "medium" | "high";
  adset?: string;
}

interface AdSetRanking {
  id: string;
  name: string;
  angle: string;
  score: number;          // 0-100
  grade: string;          // A–F
  spend: number;
  ctr: number;
  cpc: number;
  cpm: number;
  purchases: number;
  cpa: number | null;
  convRate: number;
  status: string;
  recommendation: string;
}

interface HealthScore {
  overall: number;
  ctr: number;
  efficiency: number;
  conversion: number;
  fatigue: number;
}

function scoreAdSet(ins: any): number {
  if (!ins) return 0;
  let score = 50; // base

  // CTR scoring (0-25 pts)
  if (ins.ctr >= BENCHMARKS.ctr.good) score += 25;
  else if (ins.ctr >= BENCHMARKS.ctr.ok) score += 15;
  else if (ins.ctr >= BENCHMARKS.ctr.poor) score += 5;
  else score -= 10;

  // CPC scoring (0-25 pts, inverted)
  if (ins.cpc > 0 && ins.cpc <= BENCHMARKS.cpc.good) score += 25;
  else if (ins.cpc <= BENCHMARKS.cpc.ok) score += 15;
  else if (ins.cpc <= BENCHMARKS.cpc.poor) score += 5;
  else if (ins.cpc > 0) score -= 5;

  // Frequency penalty (0 to -20)
  if (ins.frequency > BENCHMARKS.frequency.warn) score -= 20;
  else if (ins.frequency > BENCHMARKS.frequency.ok) score -= 10;

  // Purchase bonus (0-10 pts)
  if (ins.purchases > 5) score += 10;
  else if (ins.purchases > 0) score += 5;

  return Math.max(0, Math.min(100, score));
}

function gradeFromScore(score: number): string {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  if (score >= 40) return "D";
  return "F";
}

function buildRecommendations(
  campaignIns: any,
  adsets: any[]
): Recommendation[] {
  const recs: Recommendation[] = [];

  // ── Campaign-level checks ──────────────────────────────────
  if (campaignIns) {
    // Frequency fatigue
    if (campaignIns.frequency > BENCHMARKS.frequency.warn) {
      recs.push({
        id: "freq-fatigue",
        title: "Creative fatigue detected — frequency too high",
        detail: `Campaign frequency is ${campaignIns.frequency.toFixed(1)}x, above the 3.5x warning threshold. Users are seeing the same ads too often, which drives up CPM and kills CTR. Rotate in new creative variants or expand your audience.`,
        severity: "critical",
        stage: "interest",
        priority: "high",
        effort: "medium",
        impact: "high",
      });
    } else if (campaignIns.frequency > BENCHMARKS.frequency.ok) {
      recs.push({
        id: "freq-watch",
        title: "Frequency rising — monitor for fatigue",
        detail: `Frequency is at ${campaignIns.frequency.toFixed(1)}x. Not critical yet, but start preparing new creative variants before it crosses 3.5x.`,
        severity: "warning",
        stage: "interest",
        priority: "medium",
        effort: "low",
        impact: "medium",
      });
    }

    // CTR
    if (campaignIns.ctr < BENCHMARKS.ctr.poor) {
      recs.push({
        id: "ctr-low",
        title: "CTR critically below benchmark",
        detail: `Campaign CTR is ${campaignIns.ctr.toFixed(2)}% vs. the 0.5% floor benchmark. Your creatives or targeting are misaligned with the audience. Test new hooks, stronger headlines, or refine your interest targeting.`,
        severity: "critical",
        stage: "interest",
        priority: "high",
        effort: "medium",
        impact: "high",
      });
    } else if (campaignIns.ctr < BENCHMARKS.ctr.ok) {
      recs.push({
        id: "ctr-below-avg",
        title: "CTR below 1% — room for creative improvement",
        detail: `CTR of ${campaignIns.ctr.toFixed(2)}% means only 1 in 100 viewers clicks. The 1%+ benchmark is achievable with stronger pattern-interrupt visuals and more curiosity-driven copy.`,
        severity: "warning",
        stage: "interest",
        priority: "medium",
        effort: "medium",
        impact: "high",
      });
    } else if (campaignIns.ctr >= BENCHMARKS.ctr.good) {
      recs.push({
        id: "ctr-good",
        title: "Strong CTR — scale the best creatives",
        detail: `CTR is ${campaignIns.ctr.toFixed(2)}%, which beats the 2%+ benchmark. Identify the top-performing creatives in the All Ads view and consider increasing their ad set budgets.`,
        severity: "good",
        stage: "interest",
        priority: "high",
        effort: "low",
        impact: "high",
      });
    }

    // CPM
    if (campaignIns.cpm > BENCHMARKS.cpm.poor) {
      recs.push({
        id: "cpm-high",
        title: "CPM elevated — audience may be over-targeted",
        detail: `CPM of $${campaignIns.cpm.toFixed(2)} is above $35. This usually means your audience is too narrow or highly competitive. Try broadening targeting or testing a lookalike audience.`,
        severity: "warning",
        stage: "awareness",
        priority: "medium",
        effort: "low",
        impact: "medium",
      });
    }

    // CPA / conversion
    if (campaignIns.costPerPurchase && campaignIns.costPerPurchase > BENCHMARKS.cpa.poor) {
      recs.push({
        id: "cpa-high",
        title: "Cost per purchase above $60 — check landing page",
        detail: `CPA of $${campaignIns.costPerPurchase.toFixed(2)} suggests a breakdown between click and purchase. Audit the landing page load speed, mobile experience, and offer clarity. Even a 0.5% lift in conversion rate will materially cut CPA.`,
        severity: "critical",
        stage: "conversion",
        priority: "high",
        effort: "medium",
        impact: "high",
      });
    } else if (campaignIns.costPerPurchase && campaignIns.costPerPurchase <= BENCHMARKS.cpa.good) {
      recs.push({
        id: "cpa-good",
        title: "CPA is healthy — aggressive scaling opportunity",
        detail: `CPA of $${campaignIns.costPerPurchase.toFixed(2)} is under the $25 target. This is a green light to scale budget. Increase daily budget by 20-30% every 3 days to avoid triggering Meta's learning phase reset.`,
        severity: "good",
        stage: "conversion",
        priority: "high",
        effort: "low",
        impact: "high",
      });
    }

    // Zero purchases but has spend
    if (campaignIns.purchases === 0 && campaignIns.spend > 50) {
      recs.push({
        id: "no-conversions",
        title: "No purchases recorded — verify pixel firing",
        detail: `$${campaignIns.spend.toFixed(2)} spent with 0 purchases. First, verify the Meta pixel is firing on the thank-you page. Check Events Manager for Purchase events. If the pixel is healthy, the offer or landing page needs urgent review.`,
        severity: "critical",
        stage: "conversion",
        priority: "high",
        effort: "low",
        impact: "high",
      });
    }
  }

  // ── Ad Set-level checks ────────────────────────────────────
  const withData = adsets.filter(a => a.insights && a.insights.spend > 0);

  if (withData.length >= 2) {
    // Find winner and loser
    const sorted = [...withData].sort((a, b) => scoreAdSet(b.insights) - scoreAdSet(a.insights));
    const winner = sorted[0];
    const loser = sorted[sorted.length - 1];

    if (winner && loser && winner.id !== loser.id) {
      recs.push({
        id: "scale-winner",
        title: `Scale budget into "${winner.name.replace("Static - ", "")}"`,
        detail: `This ad set has the strongest performance score. Consider shifting 20-30% budget from underperforming ad sets. Do this gradually — increase by $10-15/day every 3 days to stay in Meta's learning phase.`,
        severity: "opportunity",
        stage: "consideration",
        priority: "high",
        effort: "low",
        impact: "high",
        adset: winner.name,
      });

      if (loser.insights.ctr < BENCHMARKS.ctr.poor || loser.insights.spend > 30) {
        recs.push({
          id: "pause-loser",
          title: `Review or pause "${loser.name.replace("Static - ", "")}"`,
          detail: `This ad set shows the weakest metrics. If it hasn't generated a purchase after significant spend, pause it and reallocate budget to top performers. Use the toggle on the Ad Sets page.`,
          severity: "warning",
          stage: "interest",
          priority: "medium",
          effort: "low",
          impact: "medium",
          adset: loser.name,
        });
      }
    }

    // Angle analysis — group by angle
    const byAngle: Record<string, { ctr: number[]; cpa: (number | null)[]; spend: number[] }> = {};
    withData.forEach((a: any) => {
      if (!byAngle[a.angle]) byAngle[a.angle] = { ctr: [], cpa: [], spend: [] };
      byAngle[a.angle].ctr.push(a.insights.ctr);
      byAngle[a.angle].cpa.push(a.insights.costPerPurchase);
      byAngle[a.angle].spend.push(a.insights.spend);
    });
    const angleSummary = Object.entries(byAngle).map(([angle, d]) => ({
      angle,
      avgCtr: d.ctr.reduce((s, v) => s + v, 0) / d.ctr.length,
      totalSpend: d.spend.reduce((s, v) => s + v, 0),
    })).sort((a, b) => b.avgCtr - a.avgCtr);

    if (angleSummary.length >= 2) {
      const topAngle = angleSummary[0];
      const angleLabel = topAngle.angle === "same_type" ? "Same Type / POV"
        : topAngle.angle === "therapist" ? "Therapist"
        : "AI Oracle / Birthday";
      recs.push({
        id: "angle-winner",
        title: `"${angleLabel}" angle driving best CTR`,
        detail: `Across ad sets, the ${angleLabel} angle averages ${topAngle.avgCtr.toFixed(2)}% CTR — the highest of your three angles. Consider creating additional creative variations around this angle in the next creative refresh.`,
        severity: "opportunity",
        stage: "interest",
        priority: "medium",
        effort: "medium",
        impact: "high",
      });
    }
  }

  // General best-practice recommendations
  recs.push({
    id: "creative-refresh",
    title: "Schedule bi-weekly creative refreshes",
    detail: "Facebook creative fatigue typically sets in after 7-14 days at moderate frequency. With 72 ads in rotation, audit weekly — sort by CTR in the All Ads view and proactively pause ads below 0.5% CTR before they drag down ad set quality scores.",
    severity: "opportunity",
    stage: "interest",
    priority: "medium",
    effort: "low",
    impact: "medium",
  });

  recs.push({
    id: "budget-reallocation",
    title: "Use 70/20/10 budget allocation rule",
    detail: "Proven framework: allocate 70% of budget to proven ad sets (consistent CPA under target), 20% to promising ad sets still in learning, and 10% to new tests. Review allocation weekly and shift as performance data accumulates.",
    severity: "opportunity",
    stage: "consideration",
    priority: "medium",
    effort: "low",
    impact: "medium",
  });

  recs.push({
    id: "dayparting",
    title: "Analyze time-of-day performance for dayparting",
    detail: "Numerology/relationship content typically peaks in evening hours (8pm-midnight) and weekend mornings. Once you have 2+ weeks of data, check your Ads Manager breakdown by Hour to identify peak conversion windows and consider dayparting to concentrate budget.",
    severity: "opportunity",
    stage: "conversion",
    priority: "low",
    effort: "medium",
    impact: "medium",
  });

  // Sort: critical first, then warning, then opportunity, then good
  const order: Record<Severity, number> = { critical: 0, warning: 1, opportunity: 2, good: 3 };
  recs.sort((a, b) => order[a.severity] - order[b.severity] || (a.priority === "high" ? -1 : 1));

  return recs;
}

export function registerRoutes(httpServer: Server, app: Express) {

  // ── List all campaigns in the ad account (dynamic) ──────────────────────────
  app.get("/api/campaigns", async (req, res) => {
    const token = await storage.getToken();
    if (!token) return res.status(401).json({ error: "No token" });
    try {
      const data = await fetchMeta(`${ACT}/campaigns`, token, {
        fields: "id,name,status,objective,daily_budget,lifetime_budget,created_time",
        limit: "50",
      });
      if (data.error) return res.status(400).json({ error: data.error.message });
      res.json({ campaigns: data.data || [] });
    } catch (e) {
      res.status(500).json({ error: "Meta API error" });
    }
  });

  // ── Single campaign overview + insights (or "all" for aggregate) ─────────────
  app.get("/api/campaigns/:campaignId", async (req, res) => {
    const token = await storage.getToken();
    if (!token) return res.status(401).json({ error: "No token" });
    const { campaignId } = req.params;
    const datePreset = (req.query.date_preset as string) || "last_7d";
    try {
      if (campaignId === "all") {
        // Aggregate across all campaigns
        const allData = await fetchMeta(`${ACT}/campaigns`, token, { fields: "id,name,status", limit: "50" });
        const campaigns = allData.data || [];
        const insightResults = await Promise.all(
          campaigns.map((c: any) =>
            fetchMeta(`${c.id}/insights`, token, { fields: INSIGHTS_FIELDS, date_preset: datePreset })
          )
        );
        // Merge all insights into one aggregated object
        const merged = insightResults.reduce((acc: any, raw: any) => {
          const ins = parseInsights(raw);
          if (!ins) return acc;
          if (!acc) return { ...ins };
          return {
            impressions: acc.impressions + ins.impressions,
            clicks: acc.clicks + ins.clicks,
            spend: acc.spend + ins.spend,
            reach: acc.reach + ins.reach,
            purchases: acc.purchases + ins.purchases,
            leads: acc.leads + ins.leads,
            landingViews: acc.landingViews + ins.landingViews,
            frequency: 0, // recalculate below
            ctr: 0, cpc: 0, cpm: 0, costPerPurchase: null, roas: null,
          };
        }, null);
        if (merged) {
          merged.ctr = merged.impressions > 0 ? (merged.clicks / merged.impressions) * 100 : 0;
          merged.cpc = merged.clicks > 0 ? merged.spend / merged.clicks : 0;
          merged.cpm = merged.impressions > 0 ? (merged.spend / merged.impressions) * 1000 : 0;
          merged.costPerPurchase = merged.purchases > 0 ? merged.spend / merged.purchases : null;
          merged.roas = merged.purchases > 0 ? (merged.purchases * 37) / merged.spend : null;
          merged.frequency = merged.reach > 0 ? merged.impressions / merged.reach : 0;
        }
        const totalBudget = campaigns.reduce((s: number, c: any) =>
          s + (c.daily_budget ? Math.round(parseInt(c.daily_budget) / 100) : 0), 0);
        return res.json({
          campaign: { id: "all", name: "All Campaigns", status: "MIXED", daily_budget: String(totalBudget * 100), objective: "MIXED" },
          insights: merged,
        });
      }
      const [campaign, insights] = await Promise.all([
        fetchMeta(campaignId, token, { fields: "id,name,status,daily_budget,lifetime_budget,objective" }),
        fetchMeta(`${campaignId}/insights`, token, { fields: INSIGHTS_FIELDS, date_preset: datePreset }),
      ]);
      res.json({ campaign, insights: parseInsights(insights) });
    } catch (e) {
      res.status(500).json({ error: "Meta API error" });
    }
  });

  // ── List ad sets for any campaign (live from Meta) ───────────────────────────
  app.get("/api/campaigns/:campaignId/adsets", async (req, res) => {
    const token = await storage.getToken();
    if (!token) return res.status(401).json({ error: "No token" });
    const { campaignId } = req.params;
    const datePreset = (req.query.date_preset as string) || "last_7d";
    try {
      if (campaignId === "all") {
        // Fetch all campaigns, then get all their ad sets merged into one flat list
        const allCampaignsData = await fetchMeta(`${ACT}/campaigns`, token, { fields: "id,name,status", limit: "50" });
        const allCampaigns = allCampaignsData.data || [];
        const adsetsByCampaign = await Promise.all(
          allCampaigns.map((c: any) =>
            fetchMeta(`${c.id}/adsets`, token, { fields: "id,name,status,daily_budget,lifetime_budget", limit: "50" })
          )
        );
        // Flatten: attach campaign name to each ad set for context
        const allAdsets: any[] = [];
        for (let ci = 0; ci < allCampaigns.length; ci++) {
          const camp = allCampaigns[ci];
          const adsets = adsetsByCampaign[ci].data || [];
          for (const a of adsets) allAdsets.push({ ...a, campaignName: camp.name });
        }
        const insightResults = await Promise.all(
          allAdsets.map((a: any) =>
            fetchMeta(`${a.id}/insights`, token, { fields: INSIGHTS_FIELDS, date_preset: datePreset })
          )
        );
        const result = allAdsets.map((a: any, i: number) => ({
          id: a.id,
          name: a.name,
          campaignName: a.campaignName,
          status: a.status,
          budget: a.daily_budget ? Math.round(parseInt(a.daily_budget) / 100) : null,
          insights: parseInsights(insightResults[i]),
        }));
        return res.json({ adsets: result });
      }
      const adsetData = await fetchMeta(`${campaignId}/adsets`, token, {
        fields: "id,name,status,daily_budget,lifetime_budget",
        limit: "50",
      });
      if (adsetData.error) return res.status(400).json({ error: adsetData.error.message });
      const adsets = adsetData.data || [];
      const insightResults = await Promise.all(
        adsets.map((a: any) =>
          fetchMeta(`${a.id}/insights`, token, { fields: INSIGHTS_FIELDS, date_preset: datePreset })
        )
      );
      const result = adsets.map((a: any, i: number) => ({
        id: a.id,
        name: a.name,
        status: a.status,
        budget: a.daily_budget ? Math.round(parseInt(a.daily_budget) / 100) : null,
        insights: parseInsights(insightResults[i]),
      }));
      res.json({ adsets: result });
    } catch (e) {
      res.status(500).json({ error: "Meta API error" });
    }
  });

  // ── List ads for any ad set (live from Meta) ─────────────────────────────────
  app.get("/api/campaigns/:campaignId/adsets/:adsetId/ads", async (req, res) => {
    const token = await storage.getToken();
    if (!token) return res.status(401).json({ error: "No token" });
    const { adsetId } = req.params;
    const datePreset = (req.query.date_preset as string) || "last_7d";
    try {
      const adsData = await fetchMeta(`${adsetId}/ads`, token, {
        fields: "id,name,status",
        limit: "100",
      });
      if (adsData.error) return res.status(400).json({ error: adsData.error.message });
      const ads = adsData.data || [];
      const insightResults = await Promise.all(
        ads.map((a: any) =>
          fetchMeta(`${a.id}/insights`, token, { fields: INSIGHTS_FIELDS, date_preset: datePreset })
        )
      );
      const result = ads.map((a: any, i: number) => ({
        id: a.id,
        name: a.name,
        label: a.name.split(" | ")[1] || a.name,
        status: a.status,
        insights: parseInsights(insightResults[i]),
      }));
      res.json({ ads: result });
    } catch (e) {
      res.status(500).json({ error: "Meta API error" });
    }
  });

  // ── Insights analysis for any campaign ──────────────────────────────────────
  app.get("/api/campaigns/:campaignId/insights-analysis", async (req, res) => {
    const token = await storage.getToken();
    if (!token) return res.status(401).json({ error: "No token" });
    const { campaignId } = req.params;
    const datePreset = (req.query.date_preset as string) || "last_7d";
    try {
      if (campaignId === "all") {
        // Aggregate insights across all campaigns
        const allCampaignsData = await fetchMeta(`${ACT}/campaigns`, token, { fields: "id,name,status", limit: "50" });
        const allCampaigns = allCampaignsData.data || [];
        // Fetch all campaign-level insights + all ad sets
        const [campInsResults, adsetsByCampaign] = await Promise.all([
          Promise.all(allCampaigns.map((c: any) =>
            fetchMeta(`${c.id}/insights`, token, { fields: INSIGHTS_FIELDS, date_preset: datePreset })
          )),
          Promise.all(allCampaigns.map((c: any) =>
            fetchMeta(`${c.id}/adsets`, token, { fields: "id,name,status,daily_budget", limit: "50" })
          )),
        ]);
        // Merge campaign insights (sum numeric fields)
        const parsedCampIns = campInsResults.map(parseInsights).filter(Boolean);
        const merged: any = parsedCampIns.reduce((acc: any, ins: any) => {
          if (!ins) return acc;
          acc.spend = (acc.spend || 0) + (ins.spend || 0);
          acc.impressions = (acc.impressions || 0) + (ins.impressions || 0);
          acc.reach = (acc.reach || 0) + (ins.reach || 0);
          acc.clicks = (acc.clicks || 0) + (ins.clicks || 0);
          acc.landingViews = (acc.landingViews || 0) + (ins.landingViews || 0);
          acc.purchases = (acc.purchases || 0) + (ins.purchases || 0);
          acc.revenue = (acc.revenue || 0) + (ins.revenue || 0);
          return acc;
        }, {});
        if (merged.impressions > 0) merged.ctr = (merged.clicks / merged.impressions) * 100;
        if (merged.clicks > 0) merged.cpc = merged.spend / merged.clicks;
        if (merged.impressions > 0) merged.cpm = (merged.spend / merged.impressions) * 1000;
        if (merged.purchases > 0) merged.costPerPurchase = merged.spend / merged.purchases;
        if (merged.purchases > 0) merged.roas = merged.revenue / merged.spend;
        merged.frequency = parsedCampIns.length > 0
          ? parsedCampIns.reduce((s: number, i: any) => s + (i?.frequency || 0), 0) / parsedCampIns.length
          : 0;
        const campaignIns = Object.keys(merged).length > 0 ? merged : null;
        // Flatten all ad sets
        const allAdsets: any[] = [];
        for (let ci = 0; ci < allCampaigns.length; ci++) {
          const camp = allCampaigns[ci];
          for (const a of adsetsByCampaign[ci].data || []) {
            allAdsets.push({ ...a, campaignName: camp.name });
          }
        }
        const adsetInsResults = await Promise.all(
          allAdsets.map((a: any) =>
            fetchMeta(`${a.id}/insights`, token, { fields: INSIGHTS_FIELDS, date_preset: datePreset })
          )
        );
        const adsetsFull = allAdsets.map((a: any, i: number) => ({
          id: a.id,
          name: a.name,
          angle: "general",
          insights: parseInsights(adsetInsResults[i]),
        }));
        const rankings: AdSetRanking[] = adsetsFull.map((a) => {
          const ins = a.insights;
          const score = scoreAdSet(ins);
          const convRate = ins && ins.clicks > 0 ? (ins.purchases / ins.clicks) * 100 : 0;
          return {
            id: a.id, name: a.name, angle: a.angle, score,
            grade: gradeFromScore(score),
            spend: ins?.spend || 0, ctr: ins?.ctr || 0, cpc: ins?.cpc || 0, cpm: ins?.cpm || 0,
            purchases: ins?.purchases || 0, cpa: ins?.costPerPurchase || null,
            convRate, status: "MIXED",
            recommendation: score >= 70 ? "Scale" : score >= 50 ? "Hold" : score > 0 ? "Review" : "No data",
          };
        }).sort((a, b) => b.score - a.score);
        const healthScore: HealthScore = {
          overall: 0,
          ctr: campaignIns ? Math.min(100, (campaignIns.ctr / BENCHMARKS.ctr.good) * 100) : 0,
          efficiency: campaignIns && campaignIns.cpc > 0 ? Math.min(100, (BENCHMARKS.cpc.ok / campaignIns.cpc) * 100) : 0,
          conversion: campaignIns && campaignIns.purchases > 0
            ? Math.min(100, (campaignIns.purchases / Math.max(1, campaignIns.clicks / 100)) * 10)
            : campaignIns?.spend && campaignIns.spend > 0 ? 10 : 0,
          fatigue: campaignIns
            ? Math.max(0, 100 - ((campaignIns.frequency - 1) / (BENCHMARKS.frequency.warn - 1)) * 100)
            : 100,
        };
        healthScore.overall = Math.round(
          (healthScore.ctr + healthScore.efficiency + healthScore.conversion + healthScore.fatigue) / 4
        );
        const funnel = campaignIns ? {
          impressions: campaignIns.impressions, reach: campaignIns.reach,
          clicks: campaignIns.clicks, landingViews: campaignIns.landingViews, purchases: campaignIns.purchases,
          impressionToClick: campaignIns.impressions > 0 ? ((campaignIns.clicks / campaignIns.impressions) * 100).toFixed(2) : null,
          clickToLanding: campaignIns.clicks > 0 && campaignIns.landingViews > 0 ? ((campaignIns.landingViews / campaignIns.clicks) * 100).toFixed(2) : null,
          landingToPurchase: campaignIns.landingViews > 0 && campaignIns.purchases > 0 ? ((campaignIns.purchases / campaignIns.landingViews) * 100).toFixed(2) : null,
        } : null;
        return res.json({ campaignIns, healthScore, funnel, rankings, recommendations: buildRecommendations(campaignIns, adsetsFull), benchmarks: BENCHMARKS });
      }

      const adsetData = await fetchMeta(`${campaignId}/adsets`, token, {
        fields: "id,name,status,daily_budget",
        limit: "50",
      });
      const adsets = adsetData.data || [];
      const [campaignRaw, campaignInsRaw, ...adsetInsRaw] = await Promise.all([
        fetchMeta(campaignId, token, { fields: "id,name,status" }),
        fetchMeta(`${campaignId}/insights`, token, { fields: INSIGHTS_FIELDS, date_preset: datePreset }),
        ...adsets.map((a: any) =>
          fetchMeta(`${a.id}/insights`, token, { fields: INSIGHTS_FIELDS, date_preset: datePreset })
        ),
      ]);
      const campaignIns = parseInsights(campaignInsRaw);
      const adsetsFull = adsets.map((a: any, i: number) => ({
        id: a.id,
        name: a.name,
        angle: "general",
        insights: parseInsights(adsetInsRaw[i]),
      }));
      const rankings: AdSetRanking[] = adsetsFull.map((a) => {
        const ins = a.insights;
        const score = scoreAdSet(ins);
        const convRate = ins && ins.clicks > 0 ? (ins.purchases / ins.clicks) * 100 : 0;
        return {
          id: a.id, name: a.name, angle: a.angle, score,
          grade: gradeFromScore(score),
          spend: ins?.spend || 0, ctr: ins?.ctr || 0, cpc: ins?.cpc || 0, cpm: ins?.cpm || 0,
          purchases: ins?.purchases || 0, cpa: ins?.costPerPurchase || null,
          convRate, status: "PAUSED",
          recommendation: score >= 70 ? "Scale" : score >= 50 ? "Hold" : score > 0 ? "Review" : "No data",
        };
      }).sort((a, b) => b.score - a.score);
      const healthScore: HealthScore = {
        overall: 0,
        ctr: campaignIns ? Math.min(100, (campaignIns.ctr / BENCHMARKS.ctr.good) * 100) : 0,
        efficiency: campaignIns && campaignIns.cpc > 0 ? Math.min(100, (BENCHMARKS.cpc.ok / campaignIns.cpc) * 100) : 0,
        conversion: campaignIns && campaignIns.purchases > 0
          ? Math.min(100, (campaignIns.purchases / Math.max(1, campaignIns.clicks / 100)) * 10)
          : campaignIns?.spend && campaignIns.spend > 0 ? 10 : 0,
        fatigue: campaignIns
          ? Math.max(0, 100 - ((campaignIns.frequency - 1) / (BENCHMARKS.frequency.warn - 1)) * 100)
          : 100,
      };
      healthScore.overall = Math.round(
        (healthScore.ctr + healthScore.efficiency + healthScore.conversion + healthScore.fatigue) / 4
      );
      const funnel = campaignIns ? {
        impressions: campaignIns.impressions, reach: campaignIns.reach,
        clicks: campaignIns.clicks, landingViews: campaignIns.landingViews, purchases: campaignIns.purchases,
        impressionToClick: campaignIns.impressions > 0 ? ((campaignIns.clicks / campaignIns.impressions) * 100).toFixed(2) : null,
        clickToLanding: campaignIns.clicks > 0 && campaignIns.landingViews > 0 ? ((campaignIns.landingViews / campaignIns.clicks) * 100).toFixed(2) : null,
        landingToPurchase: campaignIns.landingViews > 0 && campaignIns.purchases > 0 ? ((campaignIns.purchases / campaignIns.landingViews) * 100).toFixed(2) : null,
      } : null;
      res.json({ campaignIns, healthScore, funnel, rankings, recommendations: buildRecommendations(campaignIns, adsetsFull), benchmarks: BENCHMARKS });
    } catch (e) {
      res.status(500).json({ error: "Meta API error" });
    }
  });

  // Get/set token
  app.get("/api/token", async (req, res) => {
    const token = await storage.getToken();
    res.json({ hasToken: !!token });
  });

  app.post("/api/token", async (req, res) => {
    const { token } = req.body;
    if (!token || typeof token !== "string") return res.status(400).json({ error: "Token required" });
    try {
      const verify = await fetchMeta("me", token, { fields: "id,name" });
      if (verify.error) return res.status(401).json({ error: verify.error.message });
      await storage.setToken(token);
      res.json({ ok: true, name: verify.name });
    } catch (e) {
      res.status(500).json({ error: "Failed to verify token" });
    }
  });

  // Campaign overview
  app.get("/api/campaign", async (req, res) => {
    const token = await storage.getToken();
    if (!token) return res.status(401).json({ error: "No token" });
    const datePreset = (req.query.date_preset as string) || "last_7d";
    try {
      const [campaign, insights] = await Promise.all([
        fetchMeta(CAMPAIGN_ID, token, { fields: "id,name,status,daily_budget,lifetime_budget,objective" }),
        fetchMeta(`${CAMPAIGN_ID}/insights`, token, { fields: INSIGHTS_FIELDS, date_preset: datePreset }),
      ]);
      res.json({ campaign, insights: parseInsights(insights) });
    } catch (e) {
      res.status(500).json({ error: "Meta API error" });
    }
  });

  // Ad sets with insights
  app.get("/api/adsets", async (req, res) => {
    const token = await storage.getToken();
    if (!token) return res.status(401).json({ error: "No token" });
    const datePreset = (req.query.date_preset as string) || "last_7d";
    try {
      const adsetIds = AD_SETS.map((a) => a.id);
      const insightPromises = adsetIds.map((id) =>
        fetchMeta(`${id}/insights`, token, { fields: INSIGHTS_FIELDS, date_preset: datePreset })
      );
      const statusPromises = adsetIds.map((id) =>
        fetchMeta(id, token, { fields: "id,name,status,daily_budget" })
      );
      const [insightsResults, statusResults] = await Promise.all([
        Promise.all(insightPromises),
        Promise.all(statusPromises),
      ]);
      const adsets = AD_SETS.map((adset, i) => ({
        ...adset,
        status: statusResults[i]?.status || "PAUSED",
        insights: parseInsights(insightsResults[i]),
      }));
      res.json({ adsets });
    } catch (e) {
      res.status(500).json({ error: "Meta API error" });
    }
  });

  // Ads for a specific adset
  app.get("/api/adsets/:adsetId/ads", async (req, res) => {
    const token = await storage.getToken();
    if (!token) return res.status(401).json({ error: "No token" });
    const { adsetId } = req.params;
    const datePreset = (req.query.date_preset as string) || "last_7d";
    try {
      const ads = ALL_ADS.filter((a) => a.adsetId === adsetId);
      const insightPromises = ads.map((ad) =>
        fetchMeta(`${ad.id}/insights`, token, { fields: INSIGHTS_FIELDS, date_preset: datePreset })
      );
      const insightsResults = await Promise.all(insightPromises);
      const result = ads.map((ad, i) => ({
        ...ad,
        label: ad.name.split(" | ")[1] || ad.name,
        insights: parseInsights(insightsResults[i]),
      }));
      res.json({ ads: result });
    } catch (e) {
      res.status(500).json({ error: "Meta API error" });
    }
  });

  // All ads insights
  app.get("/api/ads", async (req, res) => {
    const token = await storage.getToken();
    if (!token) return res.status(401).json({ error: "No token" });
    const datePreset = (req.query.date_preset as string) || "last_7d";
    try {
      const insightPromises = ALL_ADS.map((ad) =>
        fetchMeta(`${ad.id}/insights`, token, { fields: INSIGHTS_FIELDS, date_preset: datePreset })
      );
      const insightsResults = await Promise.all(insightPromises);
      const result = ALL_ADS.map((ad, i) => ({
        ...ad,
        label: ad.name.split(" | ")[1] || ad.name,
        insights: parseInsights(insightsResults[i]),
      }));
      res.json({ ads: result });
    } catch (e) {
      res.status(500).json({ error: "Meta API error" });
    }
  });

  // Toggle ad set status
  app.post("/api/adsets/:adsetId/toggle", async (req, res) => {
    const token = await storage.getToken();
    if (!token) return res.status(401).json({ error: "No token" });
    const { adsetId } = req.params;
    const { status } = req.body;
    try {
      const result = await fetch(`${META_BASE}/${adsetId}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ status, access_token: token }),
      });
      const data = await result.json();
      if (data.error) return res.status(400).json({ error: data.error.message });
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: "Meta API error" });
    }
  });

  // Toggle campaign status
  app.post("/api/campaign/toggle", async (req, res) => {
    const token = await storage.getToken();
    if (!token) return res.status(401).json({ error: "No token" });
    const { status } = req.body;
    try {
      const result = await fetch(`${META_BASE}/${CAMPAIGN_ID}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ status, access_token: token }),
      });
      const data = await result.json();
      if (data.error) return res.status(400).json({ error: data.error.message });
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: "Meta API error" });
    }
  });

  // ── Geography Breakdown ─────────────────────────────────────────────────
  app.get("/api/geography", async (req, res) => {
    const token = await storage.getToken();
    if (!token) return res.status(401).json({ error: "No token" });
    const datePreset = (req.query.date_preset as string) || "last_7d";
    // Accept comma-separated campaign IDs, or fall back to fetching all from account
    const campaignIdsParam = req.query.campaign_ids as string | undefined;

    try {
      const GEO_FIELDS = "impressions,clicks,spend,ctr,cpc,actions,cost_per_action_type";

      // Resolve campaign IDs — use provided list or fetch all from account
      let campaignIds: string[];
      if (campaignIdsParam) {
        campaignIds = campaignIdsParam.split(",").filter(Boolean);
      } else {
        const allCampaigns = await fetchMeta(`${ACT}/campaigns`, token, {
          fields: "id", limit: "50",
        });
        campaignIds = (allCampaigns.data || []).map((c: any) => c.id);
      }

      // For each campaign, fetch its ad sets (for language breakdown)
      const allAdsets: { id: string; name: string }[] = [];
      const adsetsByCampaign = await Promise.all(
        campaignIds.map((cid) =>
          fetchMeta(`${cid}/adsets`, token, { fields: "id,name", limit: "50" })
        )
      );
      for (const r of adsetsByCampaign) {
        for (const a of r.data || []) allAdsets.push(a);
      }

      // Fetch country breakdown per campaign + per ad set in parallel
      const [campaignGeoResults, adsetGeoResults] = await Promise.all([
        Promise.all(campaignIds.map((cid) =>
          fetchMeta(`${cid}/insights`, token, {
            fields: GEO_FIELDS, date_preset: datePreset,
            breakdowns: "country", level: "campaign",
          })
        )),
        Promise.all(allAdsets.map((a) =>
          fetchMeta(`${a.id}/insights`, token, {
            fields: GEO_FIELDS, date_preset: datePreset,
            breakdowns: "country", level: "adset",
          })
        )),
      ]);

      // Merge country rows
      const countryMap: Record<string, {
        country: string; countryCode: string; language: string;
        impressions: number; clicks: number; spend: number;
        ctr: number; cpc: number; purchases: number; cpa: number | null;
      }> = {};

      function mergeRows(rows: any[]) {
        for (const row of rows) {
          const cc = row.country || "XX";
          const purchases = (row.actions || []).find((a: any) => a.action_type === "offsite_conversion.fb_pixel_purchase");
          const cpaVal = (row.cost_per_action_type || []).find((a: any) => a.action_type === "offsite_conversion.fb_pixel_purchase");
          if (!countryMap[cc]) {
            countryMap[cc] = {
              country: COUNTRY_NAMES[cc] || cc,
              countryCode: cc,
              language: COUNTRY_LANG_MAP[cc] || "Other",
              impressions: 0, clicks: 0, spend: 0, ctr: 0, cpc: 0, purchases: 0, cpa: null,
            };
          }
          const e = countryMap[cc];
          e.impressions += parseInt(row.impressions || "0");
          e.clicks += parseInt(row.clicks || "0");
          e.spend += parseFloat(row.spend || "0");
          e.purchases += parseInt(purchases?.value || "0");
          if (cpaVal) e.cpa = parseFloat(cpaVal.value);
        }
      }
      for (const cr of campaignGeoResults) { if (cr?.data) mergeRows(cr.data); }

      // Ad set language breakdown — group by ad set name patterns
      const languageMap: Record<string, {
        language: string; adsetId: string; adsetName: string;
        impressions: number; clicks: number; spend: number;
        purchases: number; ctr: number; cpc: number; cpa: number | null;
      }> = {};

      for (let i = 0; i < allAdsets.length; i++) {
        const as = allAdsets[i];
        const rows = adsetGeoResults[i]?.data || [];
        // Infer language from ad set name — use word-boundary matches only to avoid
        // false positives (e.g. "unde" in "Understand" matching "de" for German)
        const nameLower = as.name.toLowerCase();
        const hasWord = (w: string) => new RegExp(`\\b${w}\\b`).test(nameLower);
        const lang = hasWord("spanish") || hasWord("español") ? "Spanish"
          : hasWord("portuguese") || hasWord("portugues") ? "Portuguese"
          : hasWord("french") || hasWord("français") ? "French"
          : hasWord("german") || hasWord("deutsch") ? "German"
          : hasWord("italian") || hasWord("italiano") ? "Italian"
          : hasWord("broad") || hasWord("dlo") ? "Multi"
          : hasWord("intl") || hasWord("international") || hasWord("english") ? "English"
          : as.name.toLowerCase().startsWith("intl") ? "English"
          : null; // null = not an intl ad set, skip it
        // Skip US / non-language ad sets entirely from the language breakdown
        if (lang === null) continue;
        const key = as.id;
        if (!languageMap[key]) {
          languageMap[key] = {
            language: lang, adsetId: as.id, adsetName: as.name,
            impressions: 0, clicks: 0, spend: 0, purchases: 0, ctr: 0, cpc: 0, cpa: null,
          };
        }
        for (const row of rows) {
          const purchases = (row.actions || []).find((a: any) => a.action_type === "offsite_conversion.fb_pixel_purchase");
          const cpaVal = (row.cost_per_action_type || []).find((a: any) => a.action_type === "offsite_conversion.fb_pixel_purchase");
          languageMap[key].impressions += parseInt(row.impressions || "0");
          languageMap[key].clicks += parseInt(row.clicks || "0");
          languageMap[key].spend += parseFloat(row.spend || "0");
          languageMap[key].purchases += parseInt(purchases?.value || "0");
          if (cpaVal) languageMap[key].cpa = parseFloat(cpaVal.value);
        }
      }

      const countries = Object.values(countryMap).map((c) => ({
        ...c,
        ctr: c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0,
        cpc: c.clicks > 0 ? c.spend / c.clicks : 0,
      })).sort((a, b) => b.spend - a.spend);

      const languages = Object.values(languageMap)
        .filter(l => l.spend > 0 || l.impressions > 0)
        .map((l) => ({
          ...l,
          ctr: l.impressions > 0 ? (l.clicks / l.impressions) * 100 : 0,
          cpc: l.clicks > 0 ? l.spend / l.clicks : 0,
        })).sort((a, b) => b.spend - a.spend);

      res.json({ countries, languages, campaignIds, lastUpdated: new Date().toISOString() });
    } catch (e) {
      console.error("Geography error:", e);
      res.status(500).json({ error: "Meta API error" });
    }
  });

  // ── Insights / Performance Analysis ───────────────────────────────────────
  app.get("/api/insights-analysis", async (req, res) => {
    const token = await storage.getToken();
    if (!token) return res.status(401).json({ error: "No token" });
    const datePreset = (req.query.date_preset as string) || "last_7d";

    try {
      // Fetch campaign + all ad set data in parallel
      const adsetIds = AD_SETS.map((a) => a.id);
      const [campaignRaw, campaignInsRaw, ...adsetInsRaw] = await Promise.all([
        fetchMeta(CAMPAIGN_ID, token, { fields: "id,name,status" }),
        fetchMeta(`${CAMPAIGN_ID}/insights`, token, { fields: INSIGHTS_FIELDS, date_preset: datePreset }),
        ...adsetIds.map((id) =>
          fetchMeta(`${id}/insights`, token, { fields: INSIGHTS_FIELDS, date_preset: datePreset })
        ),
      ]);

      const campaignIns = parseInsights(campaignInsRaw);
      const adsets = AD_SETS.map((adset, i) => ({
        ...adset,
        insights: parseInsights(adsetInsRaw[i]),
      }));

      // Build ad set rankings
      const rankings: AdSetRanking[] = adsets.map((a) => {
        const ins = a.insights;
        const score = scoreAdSet(ins);
        const convRate = ins && ins.clicks > 0 ? (ins.purchases / ins.clicks) * 100 : 0;
        return {
          id: a.id,
          name: a.name,
          angle: a.angle,
          score,
          grade: gradeFromScore(score),
          spend: ins?.spend || 0,
          ctr: ins?.ctr || 0,
          cpc: ins?.cpc || 0,
          cpm: ins?.cpm || 0,
          purchases: ins?.purchases || 0,
          cpa: ins?.costPerPurchase || null,
          convRate,
          status: "PAUSED",
          recommendation: score >= 70 ? "Scale" : score >= 50 ? "Hold" : score > 0 ? "Review" : "No data",
        };
      }).sort((a, b) => b.score - a.score);

      // Campaign health score
      const healthScore: HealthScore = {
        overall: 0,
        ctr: campaignIns ? Math.min(100, (campaignIns.ctr / BENCHMARKS.ctr.good) * 100) : 0,
        efficiency: campaignIns && campaignIns.cpc > 0
          ? Math.min(100, (BENCHMARKS.cpc.ok / campaignIns.cpc) * 100)
          : 0,
        conversion: campaignIns && campaignIns.purchases > 0
          ? Math.min(100, (campaignIns.purchases / Math.max(1, campaignIns.clicks / 100)) * 10)
          : campaignIns?.spend && campaignIns.spend > 0 ? 10 : 0,
        fatigue: campaignIns
          ? Math.max(0, 100 - ((campaignIns.frequency - 1) / (BENCHMARKS.frequency.warn - 1)) * 100)
          : 100,
      };
      healthScore.overall = Math.round(
        (healthScore.ctr + healthScore.efficiency + healthScore.conversion + healthScore.fatigue) / 4
      );

      // Funnel stats
      const funnel = campaignIns ? {
        impressions: campaignIns.impressions,
        reach: campaignIns.reach,
        clicks: campaignIns.clicks,
        landingViews: campaignIns.landingViews,
        purchases: campaignIns.purchases,
        impressionToClick: campaignIns.impressions > 0
          ? ((campaignIns.clicks / campaignIns.impressions) * 100).toFixed(2)
          : null,
        clickToLanding: campaignIns.clicks > 0 && campaignIns.landingViews > 0
          ? ((campaignIns.landingViews / campaignIns.clicks) * 100).toFixed(2)
          : null,
        landingToPurchase: campaignIns.landingViews > 0 && campaignIns.purchases > 0
          ? ((campaignIns.purchases / campaignIns.landingViews) * 100).toFixed(2)
          : null,
      } : null;

      const recommendations = buildRecommendations(campaignIns, adsets);

      res.json({
        campaignIns,
        healthScore,
        funnel,
        rankings,
        recommendations,
        benchmarks: BENCHMARKS,
      });
    } catch (e) {
      res.status(500).json({ error: "Meta API error" });
    }
  });
}
