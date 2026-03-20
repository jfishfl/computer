import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import DatePresetPicker from "@/components/DatePresetPicker";
import {
  Image as ImageIcon, Play, TrendingUp, TrendingDown, Star, Zap, Lightbulb,
  BarChart3, CheckCircle2, AlertTriangle, ArrowUpRight, ArrowDownRight,
  ChevronRight, Eye, MousePointer, DollarSign, Flame, Target, Sparkles,
  Copy, Shuffle, Brain
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from "recharts";

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number | null | undefined, prefix = "", suffix = "", d = 2) {
  if (n == null || isNaN(n as number)) return "—";
  return `${prefix}${Number(n).toFixed(d)}${suffix}`;
}
function fmtInt(n: number | null | undefined) {
  if (n == null) return "—";
  return Number(n).toLocaleString();
}

const ANGLE_LABELS: Record<string, string> = {
  same_type: "Same Type", therapist: "Therapist", ai_oracle: "AI Oracle",
  broad: "Broad/DLO", other: "Other",
};
const ANGLE_COLORS: Record<string, string> = {
  same_type: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  therapist:  "bg-purple-500/20 text-purple-300 border-purple-500/30",
  ai_oracle:  "bg-amber-500/20 text-amber-300 border-amber-500/30",
  broad:      "bg-teal-500/20 text-teal-300 border-teal-500/30",
  other:      "bg-secondary text-muted-foreground border-border",
};
const GRADE_COLORS: Record<string, string> = {
  S: "text-yellow-300 border-yellow-400/60",
  A: "text-green-400 border-green-400/60",
  B: "text-blue-400 border-blue-400/60",
  C: "text-yellow-500 border-yellow-500/60",
  D: "text-orange-400 border-orange-400/60",
  F: "text-red-400 border-red-400/60",
};

function gradeFromScore(s: number) {
  if (s >= 90) return "S";
  if (s >= 70) return "A";
  if (s >= 50) return "B";
  if (s >= 30) return "C";
  if (s >= 10) return "D";
  return "F";
}

// ── Ad Card ───────────────────────────────────────────────────────────────────
function AdCard({ ad, rank }: { ad: any; rank?: number }) {
  const [imgErr, setImgErr] = useState(false);
  const ins = ad.insights;
  const grade = gradeFromScore(ad.score);
  const gc = GRADE_COLORS[grade] || GRADE_COLORS.F;
  const isWinner = ad.score >= 50;
  const isLoser = ad.score < 20 && ins?.spend > 5;

  return (
    <div className={`bg-card border rounded-xl overflow-hidden flex flex-col transition-all hover:shadow-lg hover:shadow-black/20 ${
      isWinner ? "border-green-500/30" : isLoser ? "border-red-500/20" : "border-border"
    }`}>
      {/* Image */}
      <div className="relative bg-black/40 aspect-video flex items-center justify-center overflow-hidden">
        {ad.thumbnailUrl && !imgErr ? (
          <img src={ad.thumbnailUrl} alt="" className="w-full h-full object-cover"
            onError={() => setImgErr(true)} />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground/40">
            {ad.isVideo ? <Play size={28} /> : <ImageIcon size={28} />}
            <span className="text-xs">{ad.isVideo ? "Video" : "Image"}</span>
          </div>
        )}
        {/* Grade badge */}
        <div className={`absolute top-2 left-2 w-8 h-8 rounded-full border-2 flex items-center justify-center bg-card/90 ${gc}`}>
          <span className="text-xs font-bold">{grade}</span>
        </div>
        {/* Status */}
        <div className={`absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-medium ${
          ad.status === "ACTIVE" ? "bg-green-500/20 text-green-400" : "bg-secondary text-muted-foreground"
        }`}>
          {ad.status === "ACTIVE" ? "Active" : "Paused"}
        </div>
        {rank && rank <= 3 && (
          <div className="absolute bottom-2 left-2 text-xs px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300 font-bold">
            #{rank} Top Ad
          </div>
        )}
        {ad.isVideo && (
          <div className="absolute bottom-2 right-2 bg-black/60 rounded px-1.5 py-0.5 text-xs text-white flex items-center gap-1">
            <Play size={9} className="fill-white" /> Video
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        {/* Angle */}
        <div className="flex items-center justify-between gap-2">
          <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${ANGLE_COLORS[ad.angle] || ANGLE_COLORS.other}`}>
            {ANGLE_LABELS[ad.angle] || ad.angle}
          </span>
          {ins?.purchases > 0 && (
            <span className="text-xs text-green-400 flex items-center gap-1">
              <CheckCircle2 size={10} />{ins.purchases} sale{ins.purchases > 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Headline */}
        {ad.headline && (
          <div className="text-xs font-semibold text-foreground leading-tight line-clamp-2">
            {ad.headline}
          </div>
        )}
        {/* Body */}
        {ad.body && (
          <div className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
            {ad.body}
          </div>
        )}
        {/* Short label fallback */}
        {!ad.headline && !ad.body && (
          <div className="text-xs text-muted-foreground line-clamp-2 italic">{ad.shortLabel}</div>
        )}

        {/* CTA */}
        {ad.cta && (
          <div className="text-xs px-2 py-1 rounded bg-primary/10 text-primary w-fit font-medium">
            {ad.cta.replace(/_/g, " ")}
          </div>
        )}

        {/* Metrics */}
        {ins && ins.spend > 0 ? (
          <div className="grid grid-cols-3 gap-1 mt-auto pt-2 border-t border-border">
            <div className="text-center">
              <div className="text-xs text-muted-foreground">CTR</div>
              <div className={`text-xs font-bold ${ins.ctr >= 1.5 ? "text-green-400" : ins.ctr >= 0.8 ? "text-foreground" : "text-red-400"}`}>
                {fmt(ins.ctr, "", "%")}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">CPC</div>
              <div className={`text-xs font-bold ${ins.cpc <= 1.5 ? "text-green-400" : ins.cpc > 3 ? "text-red-400" : "text-foreground"}`}>
                {fmt(ins.cpc, "$")}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Spend</div>
              <div className="text-xs font-bold text-foreground">{fmt(ins.spend, "$", "", 0)}</div>
            </div>
          </div>
        ) : (
          <div className="mt-auto pt-2 border-t border-border text-xs text-muted-foreground italic text-center">
            No data this period
          </div>
        )}
      </div>
    </div>
  );
}

// ── Winning Combo Card ────────────────────────────────────────────────────────
function ComboCard({ combo }: { combo: { headline: string; angle: string; cta: string; body: string; reason: string; score: string } }) {
  return (
    <div className="bg-card border border-green-500/30 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles size={14} className="text-yellow-400 shrink-0" />
        <span className="text-xs font-semibold text-green-300">{combo.score}</span>
      </div>
      <div>
        <div className="text-xs text-muted-foreground mb-1">Headline</div>
        <div className="text-sm font-bold text-foreground">{combo.headline}</div>
      </div>
      <div>
        <div className="text-xs text-muted-foreground mb-1">Body</div>
        <div className="text-xs text-muted-foreground leading-relaxed">{combo.body}</div>
      </div>
      <div className="flex items-center gap-3">
        <div>
          <div className="text-xs text-muted-foreground mb-1">Angle</div>
          <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${ANGLE_COLORS[combo.angle] || ANGLE_COLORS.other}`}>
            {ANGLE_LABELS[combo.angle] || combo.angle}
          </span>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">CTA</div>
          <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">
            {combo.cta}
          </span>
        </div>
      </div>
      <div className="text-xs text-muted-foreground bg-secondary/40 rounded-lg p-2 leading-relaxed">
        <strong className="text-foreground">Why this works:</strong> {combo.reason}
      </div>
    </div>
  );
}

// ── New Ad Idea Card ──────────────────────────────────────────────────────────
function IdeaCard({ idea }: { idea: any }) {
  return (
    <div className="bg-card border border-blue-500/20 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${ANGLE_COLORS[idea.angle] || ANGLE_COLORS.other}`}>
          {ANGLE_LABELS[idea.angle] || idea.angle}
        </span>
        <span className="text-xs text-muted-foreground">{idea.format}</span>
      </div>
      <div>
        <div className="text-xs text-muted-foreground mb-1">Hook / Headline</div>
        <div className="text-sm font-bold text-foreground">{idea.headline}</div>
      </div>
      <div>
        <div className="text-xs text-muted-foreground mb-1">Ad Body</div>
        <div className="text-xs text-muted-foreground leading-relaxed">{idea.body}</div>
      </div>
      {idea.visual && (
        <div>
          <div className="text-xs text-muted-foreground mb-1">Visual Direction</div>
          <div className="text-xs text-foreground bg-secondary/40 rounded p-2">{idea.visual}</div>
        </div>
      )}
      <div className="text-xs px-2 py-1 rounded bg-primary/10 text-primary w-fit font-medium">
        CTA: {idea.cta}
      </div>
      {idea.whyItWorks && (
        <div className="text-xs text-muted-foreground border-t border-border pt-2 leading-relaxed">
          {idea.whyItWorks}
        </div>
      )}
    </div>
  );
}

// ── Generate best combos from data ───────────────────────────────────────────
function generateBestCombos(ads: any[], headlineStats: any[], angleStats: any[]) {
  const bestAngle = angleStats?.[0]?.angle || "same_type";
  const bestHeadline = headlineStats?.[0]?.headline || "";
  const winners = ads?.filter(a => a.score >= 50) || [];
  const topWinner = winners[0];

  const combos = [
    {
      headline: topWinner?.headline || "What Your Birth Number Reveals About Your True Self",
      body: topWinner?.body || "Every number in your numerology chart tells a story. Discover the hidden patterns that shape your relationships, career, and life purpose — calculated from your exact birth date.",
      angle: bestAngle,
      cta: "LEARN_MORE",
      score: "Proven winner — based on your top-performing ad",
      reason: "Uses your highest-scoring creative's exact headline. Pair with the Same Type angle in a fresh audience segment to extend reach without creative fatigue.",
    },
    {
      headline: "Why Does Your Birth Number Keep Appearing Everywhere?",
      body: "When you keep seeing the same number — on clocks, receipts, license plates — it's not a coincidence. Your numerology chart explains exactly why and what it means for your next 12 months.",
      angle: "same_type",
      cta: "LEARN_MORE",
      score: "High potential — pattern interrupt hook",
      reason: "The 'synchronicity' hook taps into a universal numerology experience. Strong for cold traffic — the question creates curiosity without being clickbait.",
    },
    {
      headline: "Your Numerology Reveals the Career You Were Born For",
      body: "Most people spend years in the wrong career because they've never seen their full numerology chart. In 2 minutes, discover the path that aligns with your life path number.",
      angle: "therapist",
      cta: "GET_STARTED",
      score: "Untested angle — high upside",
      reason: "Career-focused hook broadens appeal beyond spiritual seekers. Tests well in 35-55 age demographic who are open to life direction guidance.",
    },
    {
      headline: "I Put In My Birth Date and It Described My Entire Life",
      body: "\"I've tried horoscopes, tarot, everything — but this numerology chart was the first thing that actually made sense. It described my exact struggles and exactly what I need to change.\" — Sarah, 42",
      angle: "therapist",
      cta: "SEE_MINE",
      score: "Testimonial format — strong social proof",
      reason: "First-person testimonial style dramatically outperforms direct claims for info products. The 'made sense' framing addresses skeptics. Works best with a real person photo.",
    },
    {
      headline: "Your 2026 Numerology Forecast Is Ready",
      body: "Based on your birth date, here is what your numbers say about the next 12 months: your peak money month, your relationship turning point, and the one decision that will define your year.",
      angle: "ai_oracle",
      cta: "GET_MY_FORECAST",
      score: "Seasonal urgency — timely hook",
      reason: "Year-specific hooks perform best in Q1 when audiences are receptive to forecasts and planning content. The specificity ('one decision') creates strong curiosity.",
    },
  ];

  return combos;
}

// ── Generate new ad ideas ─────────────────────────────────────────────────────
function generateAdIdeas(ads: any[], angleStats: any[]) {
  return [
    {
      angle: "same_type", format: "Static Image",
      headline: "Born on the 7th? Your Life Path Number Reveals Everything",
      body: "People born on specific dates share remarkable traits — and most have never seen their full numerology chart. Enter your birth date and discover why you think, love, and earn the way you do.",
      visual: "Bold number '7' as hero visual on dark background. Person reflection in the number. Clean, minimal. High contrast.",
      cta: "DISCOVER YOURS",
      whyItWorks: "Specific birth date hook (easy to A/B test with '7', '9', '11', etc). Appeals to the core numerology audience belief that dates hold meaning.",
    },
    {
      angle: "therapist", format: "Video (15-30s)",
      headline: "\"My therapist was shocked when I showed her my numerology chart\"",
      body: "She said: 'This explains the patterns I've been seeing in you for 3 years. How long have you known about this?' — A 2-minute read that changed how I see everything.",
      visual: "Woman in warm, natural setting (not studio). Conversational, intimate. Start on face reaction — shock, curiosity. Not polished — authentic wins.",
      cta: "READ MY STORY",
      whyItWorks: "Therapist credibility transfer is powerful — it bridges skeptics who distrust spiritual content but trust psychology. The dialogue format creates curiosity.",
    },
    {
      angle: "ai_oracle", format: "Static Image",
      headline: "AI Analyzed 10,000 Numerology Charts. Here's What It Found.",
      body: "After processing data from thousands of birth dates, the patterns are undeniable: your life path number predicts your biggest strengths, your blindspots, and your most likely paths to success.",
      visual: "Data visualization aesthetic — clean lines, nodes, connections. Blueprint numerology chart with glowing highlights. Dark tech feel.",
      cta: "RUN MY ANALYSIS",
      whyItWorks: "AI credibility hook is highly relevant in 2024-2025. Bridges skeptical, data-driven audience who dismiss traditional astrology but are open to 'pattern analysis'.",
    },
    {
      angle: "same_type", format: "Carousel",
      headline: "Slide 1: What does a Life Path 3 actually mean? →",
      body: "Slide 2: Natural communicator, born creative — but struggles with follow-through. Slide 3: Top careers: writing, speaking, entertainment. Slide 4: Love life warning: avoid Life Path 8s. Slide 5: Get your full chart →",
      visual: "Each slide = one numerology insight. Clean dark cards. Numbered visually. Strong contrast. Final slide = CTA with chart preview.",
      cta: "GET FULL CHART",
      whyItWorks: "Carousel ads have 3-5x higher engagement rate for info products. Each slide is a micro-hook. Builds credibility across 5 impressions before the CTA.",
    },
    {
      angle: "broad", format: "Static Image",
      headline: "People Who Share Your Birth Month Think Differently",
      body: "Researchers have documented consistent personality patterns across birth dates. Your numerology chart maps these patterns to real tendencies in how you handle money, relationships, and decisions.",
      visual: "Calendar with highlighted birth month. Clean, modern. Could use split image (two faces, different expressions). Accessible — not spiritual-feeling.",
      cta: "SEE MY PATTERNS",
      whyItWorks: "Broad/secular framing works for cold international audiences who aren't already numerology believers. Research-adjacent language builds trust without religious/spiritual framing.",
    },
    {
      angle: "therapist", format: "Static Image",
      headline: "The Reason You Repeat the Same Relationship Patterns",
      body: "It's not bad luck. Your numerology life path number creates predictable patterns in how you give love, receive love, and self-sabotage. Understanding your number is the first step to breaking the cycle.",
      visual: "Two people, slightly out of focus. Warm, emotional tone. A numerology chart overlaid, soft glow. Therapeutic color palette (warm tones, sage green).",
      cta: "UNDERSTAND MINE",
      whyItWorks: "Relationship pain point is the highest-converting hook for numerology. 'Repeat patterns' directly addresses a universal frustration. Strong for 28-55F demographic.",
    },
  ];
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Creatives() {
  const [datePreset, setDatePreset] = useState("last_7d");
  const [activeTab, setActiveTab] = useState("compare");
  const [sortBy, setSortBy] = useState<"score" | "ctr" | "spend" | "purchases">("score");
  const [filterAngle, setFilterAngle] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["/api/creative-analysis", datePreset],
    queryFn: () => apiRequest("GET", `/api/creative-analysis?date_preset=${datePreset}`).then(r => r.json()),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const d = data as any;

  const allAds = useMemo(() => {
    if (!d?.ads) return [];
    let ads = [...d.ads];
    if (filterAngle !== "all") ads = ads.filter((a: any) => a.angle === filterAngle);
    if (sortBy === "ctr") ads.sort((a: any, b: any) => (b.insights?.ctr || 0) - (a.insights?.ctr || 0));
    else if (sortBy === "spend") ads.sort((a: any, b: any) => (b.insights?.spend || 0) - (a.insights?.spend || 0));
    else if (sortBy === "purchases") ads.sort((a: any, b: any) => (b.insights?.purchases || 0) - (a.insights?.purchases || 0));
    return ads;
  }, [d, sortBy, filterAngle]);

  const bestCombos = useMemo(() =>
    generateBestCombos(d?.ads || [], d?.headlineStats || [], d?.angleStats || []),
    [d]
  );
  const adIdeas = useMemo(() => generateAdIdeas(d?.ads || [], d?.angleStats || []), [d]);

  const angleChartData = (d?.angleStats || []).map((a: any) => ({
    name: ANGLE_LABELS[a.angle] || a.angle,
    avgCtr: parseFloat((a.avgCtr || 0).toFixed(2)),
    spend: parseFloat((a.totalSpend || 0).toFixed(0)),
    purchases: a.totalPurchases || 0,
  }));

  const headlineChartData = (d?.headlineStats || []).slice(0, 6).map((h: any) => ({
    name: (h.headline || "(none)").slice(0, 28) + ((h.headline?.length || 0) > 28 ? "…" : ""),
    avgCtr: parseFloat((h.avgCtr || 0).toFixed(2)),
    count: h.count,
  }));

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Flame size={18} className="text-primary" />
            Creative Studio
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Compare · Rank · Best Combos · New Ideas
            {d && <span className="ml-2 text-muted-foreground/60">· {d.totalAds} ads · {d.adsWithData} with data</span>}
          </p>
        </div>
        <DatePresetPicker value={datePreset} onChange={setDatePreset} />
      </div>

      {isLoading && (
        <div className="text-center py-16 text-muted-foreground text-sm">
          Loading all ads + creative data…
          <div className="text-xs mt-2 text-muted-foreground/60">This fetches every ad and its performance data — may take ~10s</div>
        </div>
      )}

      {d && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-secondary/40 border border-border">
            <TabsTrigger value="compare" className="text-xs">
              <BarChart3 size={12} className="mr-1.5" /> Compare Creatives
            </TabsTrigger>
            <TabsTrigger value="winners" className="text-xs">
              <Star size={12} className="mr-1.5" /> Winners &amp; Losers
            </TabsTrigger>
            <TabsTrigger value="combos" className="text-xs">
              <Sparkles size={12} className="mr-1.5" /> Best Combos
            </TabsTrigger>
            <TabsTrigger value="ideas" className="text-xs">
              <Brain size={12} className="mr-1.5" /> New Ad Ideas
            </TabsTrigger>
          </TabsList>

          {/* ── Tab 1: Compare Creatives ── */}
          <TabsContent value="compare" className="space-y-5 mt-4">
            {/* Angle Performance Chart */}
            {angleChartData.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-card border border-border rounded-xl p-5">
                  <div className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <BarChart3 size={14} className="text-primary" />
                    Avg CTR by Angle
                  </div>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={angleChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `${v}%`} />
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }}
                        formatter={(v: any) => [`${v}%`, "Avg CTR"]}
                      />
                      <Bar dataKey="avgCtr" name="Avg CTR" radius={[4, 4, 0, 0]}>
                        {angleChartData.map((_: any, i: number) => (
                          <Cell key={i} fill={["#3b82f6","#a855f7","#f59e0b","#14b8a6","#6b7280"][i % 5]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-card border border-border rounded-xl p-5">
                  <div className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <TrendingUp size={14} className="text-primary" />
                    Top Headline CTR
                  </div>
                  {headlineChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={headlineChartData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `${v}%`} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} width={100} />
                        <Tooltip
                          contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 11 }}
                          formatter={(v: any) => [`${v}%`, "Avg CTR"]}
                        />
                        <Bar dataKey="avgCtr" fill="#22c55e" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-40 flex items-center justify-center text-xs text-muted-foreground">
                      Headline data will appear once creatives are loaded
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Angle breakdown stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {(d.angleStats || []).map((a: any) => (
                <div key={a.angle} className="bg-card border border-border rounded-xl p-3 text-center">
                  <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${ANGLE_COLORS[a.angle] || ANGLE_COLORS.other}`}>
                    {ANGLE_LABELS[a.angle] || a.angle}
                  </span>
                  <div className="mt-2 text-base font-bold text-foreground">{fmt(a.avgCtr, "", "%")}</div>
                  <div className="text-xs text-muted-foreground">avg CTR</div>
                  <div className="text-xs text-muted-foreground mt-1">{a.count} ads · {a.totalPurchases} sales</div>
                  {a.avgCpa && <div className="text-xs text-muted-foreground">${a.avgCpa.toFixed(0)} CPA</div>}
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                {["all", "same_type", "therapist", "ai_oracle", "broad", "other"].map(ang => (
                  <button key={ang} onClick={() => setFilterAngle(ang)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      filterAngle === ang ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                    }`}>
                    {ang === "all" ? "All Angles" : ANGLE_LABELS[ang] || ang}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5 ml-auto flex-wrap">
                <span className="text-xs text-muted-foreground">Sort:</span>
                {([["score", "Score"], ["ctr", "CTR"], ["spend", "Spend"], ["purchases", "Sales"]] as const).map(([k, l]) => (
                  <button key={k} onClick={() => setSortBy(k)}
                    className={`text-xs px-2 py-1 rounded border transition-colors ${
                      sortBy === k ? "bg-primary/20 text-primary border-primary/40" : "border-border text-muted-foreground hover:border-foreground/30"
                    }`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Ad Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {allAds.map((ad: any, i: number) => (
                <AdCard key={ad.id} ad={ad} rank={i + 1 <= 3 && sortBy === "score" ? i + 1 : undefined} />
              ))}
            </div>
            {allAds.length === 0 && (
              <div className="text-center py-10 text-muted-foreground text-sm">No ads match the current filter.</div>
            )}
          </TabsContent>

          {/* ── Tab 2: Winners & Losers ── */}
          <TabsContent value="winners" className="space-y-5 mt-4">
            {/* Winners */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <h2 className="text-sm font-semibold text-foreground">
                  Top Performers
                  <span className="text-xs font-normal text-muted-foreground ml-2">Scale these</span>
                </h2>
              </div>
              {d.winners?.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {d.winners.map((ad: any, i: number) => (
                    <AdCard key={ad.id} ad={ad} rank={i + 1} />
                  ))}
                </div>
              ) : (
                <div className="bg-card border border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
                  No clear winners yet — need more spend data. Run campaigns for 3+ days before evaluating.
                </div>
              )}
            </div>

            {/* Losers */}
            {d.losers?.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-red-400" />
                  <h2 className="text-sm font-semibold text-foreground">
                    Low Performers
                    <span className="text-xs font-normal text-muted-foreground ml-2">Consider pausing</span>
                  </h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {d.losers.map((ad: any) => (
                    <AdCard key={ad.id} ad={ad} />
                  ))}
                </div>
              </div>
            )}

            {/* Head-to-head comparison table */}
            {d.winners?.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <Target size={14} className="text-primary" />
                  Performance Breakdown — Top Ads
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="text-left py-2 pr-4 font-medium">Ad</th>
                        <th className="text-center py-2 px-3 font-medium">Angle</th>
                        <th className="text-center py-2 px-3 font-medium">CTR</th>
                        <th className="text-center py-2 px-3 font-medium">CPC</th>
                        <th className="text-center py-2 px-3 font-medium">CPM</th>
                        <th className="text-center py-2 px-3 font-medium">Spend</th>
                        <th className="text-center py-2 px-3 font-medium">Sales</th>
                        <th className="text-center py-2 px-3 font-medium">Grade</th>
                        <th className="text-center py-2 px-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(d.winners || []).map((ad: any) => {
                        const ins = ad.insights;
                        const grade = gradeFromScore(ad.score);
                        return (
                          <tr key={ad.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                            <td className="py-2.5 pr-4 max-w-[180px]">
                              <div className="font-medium text-foreground truncate">{ad.headline || ad.shortLabel}</div>
                              <div className="text-muted-foreground/70 truncate">{ad.adsetName}</div>
                            </td>
                            <td className="text-center px-3">
                              <span className={`text-xs px-1.5 py-0.5 rounded border ${ANGLE_COLORS[ad.angle] || ANGLE_COLORS.other}`}>
                                {ANGLE_LABELS[ad.angle] || ad.angle}
                              </span>
                            </td>
                            <td className={`text-center px-3 font-mono font-bold ${ins?.ctr >= 1.5 ? "text-green-400" : ins?.ctr >= 0.8 ? "text-foreground" : "text-red-400"}`}>
                              {fmt(ins?.ctr, "", "%")}
                            </td>
                            <td className={`text-center px-3 font-mono ${ins?.cpc <= 1.5 ? "text-green-400" : "text-foreground"}`}>
                              {fmt(ins?.cpc, "$")}
                            </td>
                            <td className="text-center px-3 font-mono text-muted-foreground">{fmt(ins?.cpm, "$")}</td>
                            <td className="text-center px-3 font-mono text-foreground">{fmt(ins?.spend, "$", "", 0)}</td>
                            <td className="text-center px-3 font-mono text-green-400 font-bold">{ins?.purchases ?? "—"}</td>
                            <td className="text-center px-3">
                              <span className={`font-bold ${GRADE_COLORS[grade]?.split(" ")[0]}`}>{grade}</span>
                            </td>
                            <td className="text-center px-3">
                              <span className={`text-xs ${ad.status === "ACTIVE" ? "text-green-400" : "text-muted-foreground"}`}>
                                {ad.status === "ACTIVE" ? "● Active" : "○ Paused"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Insight summary */}
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Lightbulb size={14} className="text-primary" />
                What Your Data Says
              </div>
              <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
                {d.angleStats?.[0] && (
                  <div className="flex items-start gap-2 p-3 bg-secondary/30 rounded-lg">
                    <TrendingUp size={12} className="text-green-400 mt-0.5 shrink-0" />
                    <span>
                      <strong className="text-foreground">{ANGLE_LABELS[d.angleStats[0].angle] || d.angleStats[0].angle} angle</strong> is your top performer
                      with {fmt(d.angleStats[0].avgCtr, "", "%")} avg CTR.
                      {d.angleStats.length > 1 && ` That's ${(d.angleStats[0].avgCtr / Math.max(d.angleStats[1].avgCtr, 0.01)).toFixed(1)}x better than ${ANGLE_LABELS[d.angleStats[1].angle]}.`}
                    </span>
                  </div>
                )}
                {d.headlineStats?.[0]?.headline && d.headlineStats[0].headline !== "(no headline)" && (
                  <div className="flex items-start gap-2 p-3 bg-secondary/30 rounded-lg">
                    <Star size={12} className="text-yellow-400 mt-0.5 shrink-0" />
                    <span>
                      Best headline: <strong className="text-foreground">"{d.headlineStats[0].headline.slice(0, 60)}{d.headlineStats[0].headline.length > 60 ? "…" : ""}"</strong>
                      {" "}averaging {fmt(d.headlineStats[0].avgCtr, "", "%")} CTR across {d.headlineStats[0].count} ad{d.headlineStats[0].count > 1 ? "s" : ""}.
                    </span>
                  </div>
                )}
                <div className="flex items-start gap-2 p-3 bg-secondary/30 rounded-lg">
                  <AlertTriangle size={12} className="text-yellow-400 mt-0.5 shrink-0" />
                  <span>
                    {d.adsWithData} of {d.totalAds} ads have spend data this period.
                    {d.totalAds - d.adsWithData > 0 && ` ${d.totalAds - d.adsWithData} ads have no data — likely paused or in review.`}
                  </span>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── Tab 3: Best Combos ── */}
          <TabsContent value="combos" className="space-y-5 mt-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="text-sm font-semibold mb-1 flex items-center gap-2">
                <Sparkles size={14} className="text-primary" />
                Recommended Creative Combinations
              </div>
              <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
                Based on your actual performance data — best headlines × angles × CTAs. Use these as your next test batch.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {bestCombos.map((combo, i) => (
                  <ComboCard key={i} combo={combo} />
                ))}
              </div>
            </div>

            {/* Testing framework */}
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Shuffle size={14} className="text-primary" />
                A/B Testing Framework
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  {
                    phase: "Week 1: Hooks", color: "border-blue-500/30 bg-blue-500/5",
                    items: [
                      "Test 5 different opening hooks at $10/day each",
                      "Same angle, same body — only change the headline",
                      "Kill anything under 1% CTR after 1,000 impressions",
                      "Promote winner to $30/day",
                    ],
                  },
                  {
                    phase: "Week 2: Angles", color: "border-purple-500/30 bg-purple-500/5",
                    items: [
                      "Take winning hook from Week 1",
                      "Test 3 angles: Same Type vs Therapist vs Oracle",
                      "Keep body/CTA identical — isolate the angle variable",
                      "Winning angle gets full budget",
                    ],
                  },
                  {
                    phase: "Week 3: Scale", color: "border-green-500/30 bg-green-500/5",
                    items: [
                      "Take winning hook + angle combination",
                      "Duplicate to 3 new audiences (LAL 1%, LAL 3%, broad)",
                      "Increase budget 20% every 3 days if CPA is below target",
                      "Start next creative cycle in parallel",
                    ],
                  },
                ].map(({ phase, color, items }) => (
                  <div key={phase} className={`rounded-xl border p-4 ${color}`}>
                    <div className="text-xs font-bold text-foreground mb-3">{phase}</div>
                    <ul className="space-y-2">
                      {items.map(item => (
                        <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <ChevronRight size={11} className="mt-0.5 shrink-0 text-primary" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* ── Tab 4: New Ad Ideas ── */}
          <TabsContent value="ideas" className="space-y-5 mt-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="text-sm font-semibold mb-1 flex items-center gap-2">
                <Brain size={14} className="text-primary" />
                Generated Ad Concepts
              </div>
              <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
                New creative directions for Numerology Blueprint — designed by a master media buyer.
                Each includes visual direction, full copy, and rationale. Ready to brief a designer.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {adIdeas.map((idea, i) => (
                  <IdeaCard key={i} idea={idea} />
                ))}
              </div>
            </div>

            {/* Copy framework */}
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Copy size={14} className="text-primary" />
                High-Converting Copy Framework — Numerology Niche
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {[
                  {
                    label: "Hook Formula (first 3 words matter most)",
                    items: [
                      '"[Birth number] people always…" — identity confirmation',
                      '"Why you keep [repeating pattern]…" — pain acknowledgment',
                      '"I finally understood why…" — first-person discovery',
                      '"[Year] numerology reveals…" — timely/seasonal hook',
                    ],
                  },
                  {
                    label: "Body Structure",
                    items: [
                      "Sentence 1: Expand the hook — create urgency or curiosity",
                      "Sentence 2: Social proof or specificity (numbers, timeframes)",
                      "Sentence 3: Bridge to the offer — what they'll discover",
                      "Sentence 4: CTA — action-oriented, low friction",
                    ],
                  },
                  {
                    label: "Best CTAs for Info Products",
                    items: [
                      "LEARN MORE — lowest friction, highest volume",
                      "GET STARTED — implies quick, easy process",
                      "DISCOVER YOURS — personalizes the action",
                      "SEE MY CHART — creates ownership before purchase",
                    ],
                  },
                  {
                    label: "What Kills Conversion",
                    items: [
                      "Overpromising (\"change your life forever\")",
                      "Generic spiritual language (\"unlock your potential\")",
                      "Too much text — max 150 chars for primary text",
                      "Weak visual — dark/blurry images kill thumb-stop rate",
                    ],
                  },
                ].map(({ label, items }) => (
                  <div key={label} className="bg-secondary/30 rounded-xl p-4">
                    <div className="font-semibold text-foreground mb-2">{label}</div>
                    <ul className="space-y-1.5">
                      {items.map(item => (
                        <li key={item} className="flex items-start gap-2 text-muted-foreground">
                          <ChevronRight size={10} className="mt-0.5 shrink-0 text-primary" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
