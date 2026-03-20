import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import DatePresetPicker from "@/components/DatePresetPicker";
import CampaignPicker from "@/components/CampaignPicker";
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Lightbulb,
  ChevronRight, Target, Zap, BarChart3, Activity, ArrowUpRight, ArrowDownRight,
  Info, Star, Clock, DollarSign, ShoppingCart, Brain, Flame, Globe,
  MousePointer, Bug, Package
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip
} from "recharts";

// ── Types ────────────────────────────────────────────────────────────────────
type Severity = "critical" | "warning" | "opportunity" | "good";
type Priority = "high" | "medium" | "low";

interface Rec {
  id: string; title: string; detail: string; severity: Severity;
  stage: string; priority: Priority; effort: "low" | "medium" | "high";
  impact: "low" | "medium" | "high"; adset?: string;
}

interface Ranking {
  id: string; name: string; angle: string; score: number; grade: string;
  spend: number; ctr: number; cpc: number; cpm: number; purchases: number;
  cpa: number | null; convRate: number; recommendation: string;
}

interface HealthScore {
  overall: number; ctr: number; efficiency: number; conversion: number; fatigue: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const SEVERITY_CONFIG: Record<Severity, { icon: any; color: string; bg: string; border: string; label: string }> = {
  critical:    { icon: AlertTriangle, color: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/30",    label: "Critical"     },
  warning:     { icon: AlertTriangle, color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30", label: "Warning"      },
  opportunity: { icon: Lightbulb,    color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/30",   label: "Opportunity"  },
  good:        { icon: CheckCircle2, color: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/30",  label: "Good"         },
};

const ANGLE_LABELS: Record<string, string> = { same_type: "Same Type", therapist: "Therapist", ai_oracle: "AI Oracle" };
const ANGLE_COLORS: Record<string, string> = {
  same_type: "bg-blue-500/20 text-blue-300",
  therapist: "bg-purple-500/20 text-purple-300",
  ai_oracle: "bg-amber-500/20 text-amber-300",
};

function fmt(n: number | null | undefined, prefix = "", suffix = "", digits = 2): string {
  if (n === null || n === undefined || isNaN(n as number)) return "—";
  return `${prefix}${(typeof n === "number" ? n : parseFloat(n as any)).toFixed(digits)}${suffix}`;
}
function fmtInt(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return Number(n).toLocaleString();
}

// ── Sub-components ────────────────────────────────────────────────────────────
function GradeCircle({ grade, score }: { grade: string; score: number }) {
  const color = grade === "A" ? "text-green-400 border-green-400/40"
    : grade === "B" ? "text-blue-400 border-blue-400/40"
    : grade === "C" ? "text-yellow-400 border-yellow-400/40"
    : grade === "D" ? "text-orange-400 border-orange-400/40"
    : "text-red-400 border-red-400/40";
  return (
    <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 ${color}`}>
      <span className="text-sm font-bold">{grade}</span>
    </div>
  );
}

function ScoreBar({ value, max = 100, color = "bg-primary" }: { value: number; max?: number; color?: string }) {
  return (
    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
    </div>
  );
}

function HealthGauge({ score }: { score: number }) {
  const color = score >= 70 ? "text-green-400" : score >= 50 ? "text-yellow-400" : "text-red-400";
  const label = score >= 70 ? "Healthy" : score >= 50 ? "Needs Work" : "At Risk";
  const ringColor = score >= 70 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";
  const c = 2 * Math.PI * 42;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-28 h-28">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--secondary))" strokeWidth="8" />
          <circle cx="50" cy="50" r="42" fill="none" stroke={ringColor} strokeWidth="8"
            strokeLinecap="round" strokeDasharray={c}
            strokeDashoffset={c * (1 - score / 100)}
            style={{ transition: "stroke-dashoffset 0.6s ease" }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-bold ${color}`}>{score}</span>
          <span className="text-xs text-muted-foreground">/100</span>
        </div>
      </div>
      <span className={`text-xs font-medium ${color}`}>{label}</span>
    </div>
  );
}

function FunnelStep({ label, value, rate, isLast = false, highlight = false }: {
  label: string; value: number; rate?: string | null; isLast?: boolean; highlight?: boolean;
}) {
  return (
    <div className="flex-1 min-w-0">
      <div className={`rounded-lg p-3 border text-center ${highlight ? "bg-primary/10 border-primary/30" : "bg-secondary/50 border-border"}`}>
        <div className="text-xs text-muted-foreground mb-1">{label}</div>
        <div className="text-lg font-bold text-foreground">{value.toLocaleString()}</div>
        {rate && <div className="text-xs text-green-400 mt-0.5">{rate}% pass-through</div>}
      </div>
      {!isLast && (
        <div className="flex justify-center mt-1"><ChevronRight size={14} className="text-muted-foreground" /></div>
      )}
    </div>
  );
}

function RecCard({ rec, expanded, onToggle }: { rec: Rec; expanded: boolean; onToggle: () => void }) {
  const cfg = SEVERITY_CONFIG[rec.severity];
  const Icon = cfg.icon;
  return (
    <div className={`rounded-lg border p-4 cursor-pointer transition-all hover:bg-card/80 ${cfg.bg} ${cfg.border}`}
      onClick={onToggle} data-testid={`rec-card-${rec.id}`}>
      <div className="flex items-start gap-3">
        <Icon size={16} className={`mt-0.5 shrink-0 ${cfg.color}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-medium text-foreground leading-snug">{rec.title}</span>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${cfg.color} ${cfg.bg}`}>{cfg.label}</span>
              <ChevronRight size={13} className={`text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`} />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
            <span className="capitalize">{rec.stage}</span>
            <span>·</span>
            <span>Impact: <span className={rec.impact === "high" ? "text-green-400" : rec.impact === "medium" ? "text-yellow-400" : "text-muted-foreground"}>{rec.impact}</span></span>
            <span>·</span>
            <span>Effort: <span className={rec.effort === "low" ? "text-green-400" : rec.effort === "medium" ? "text-yellow-400" : "text-orange-400"}>{rec.effort}</span></span>
          </div>
          {expanded && (
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed border-t border-border/50 pt-3">{rec.detail}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Power Insight Card — for AI-level suggestions ─────────────────────────────
function PowerInsight({ icon: Icon, title, body, tag, color = "border-blue-500/30 bg-blue-500/5", tagColor = "text-blue-400" }: {
  icon: any; title: string; body: string; tag: string; color?: string; tagColor?: string;
}) {
  const [open, setOpen] = useState(false);
  const preview = body.length > 120 && !open ? body.slice(0, 120) + "…" : body;
  return (
    <div className={`rounded-lg border p-4 ${color}`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 shrink-0 ${tagColor}`}><Icon size={15} /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <span className="text-sm font-semibold text-foreground">{title}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded bg-secondary font-medium ${tagColor} shrink-0`}>{tag}</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{preview}</p>
          {body.length > 120 && (
            <button onClick={() => setOpen(!open)} className="text-xs text-primary mt-1 hover:underline">
              {open ? "Show less" : "Read more"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Generate power insights from real data ────────────────────────────────────
function generatePowerInsights(
  campaignIns: any,
  rankings: Ranking[],
  pnl: any,
  funnel: any
) {
  const tips: Array<{ icon: any; title: string; body: string; tag: string; color: string; tagColor: string; priority: number }> = [];

  // ROAS-based
  if (pnl?.trueRoas !== null && pnl?.trueRoas !== undefined) {
    if (pnl.trueRoas < 1) {
      tips.push({
        icon: TrendingDown, title: "ROAS below breakeven — campaign losing money",
        body: `True ROAS is ${pnl.trueRoas.toFixed(2)}x based on actual DB revenue ($${pnl.dbRevenue?.toFixed(2)}) vs Meta spend ($${pnl.metaSpend?.toFixed(2)}). You're losing $${Math.abs(pnl.profit)?.toFixed(2)} this period. Immediate actions: (1) Pause ad sets below 0.5% CTR, (2) Cut budgets by 20-30% on campaigns with no purchases in 3+ days, (3) Test a new VSL or hook — numerology buyers respond best to identity-first angles ("Your birth number reveals why you feel stuck"). (4) Ensure the thank-you page pixel fires correctly.`,
        tag: "URGENT", color: "border-red-500/40 bg-red-500/5", tagColor: "text-red-400", priority: 0,
      });
    } else if (pnl.trueRoas >= 1 && pnl.trueRoas < 2) {
      tips.push({
        icon: TrendingUp, title: "Profitable but thin — optimize before scaling",
        body: `True ROAS is ${pnl.trueRoas.toFixed(2)}x. You're making money but not enough margin to scale aggressively. Target: 2.5x+ ROAS before increasing budgets >20%. Focus on: improving LP conversion rate (even 0.5% lift doubles profit at same spend), testing order bump offers on checkout to boost AOV, and pruning non-converting ad sets. Your checkout-to-purchase rate is the #1 lever right now.`,
        tag: "Scale Ready", color: "border-yellow-500/30 bg-yellow-500/5", tagColor: "text-yellow-400", priority: 1,
      });
    } else {
      tips.push({
        icon: Flame, title: `ROAS at ${pnl.trueRoas.toFixed(2)}x — time to scale`,
        body: `Excellent profitability. With ROAS above 2x and ${pnl.profitMargin?.toFixed(1)}% margin, you have clear runway to scale. Strategy: (1) Increase winning ad set budgets by 20-30% every 3 days (Meta's learning phase needs 50 conversions/week). (2) Duplicate top-performing ad sets to new audiences (LAL 1%, LAL 3%, broad). (3) Launch a retention email sequence to convert LP visitors who viewed checkout but didn't buy. (4) Add a high-ticket upsell ($47-$97) for buyers — your numerology buyers over-index on continuity offers.`,
        tag: "Scale Now", color: "border-green-500/40 bg-green-500/5", tagColor: "text-green-400", priority: 0,
      });
    }
  }

  // Attribution bug
  if (pnl?.attributionBugCount > 0) {
    tips.push({
      icon: Bug, title: `Attribution bug costing you data on ${pnl.attributionBugCount} conversions`,
      body: `RedTrack is receiving literal \`{{ad.id}}\` template strings instead of resolved values — meaning ${pnl.attributionGapPct?.toFixed(1)}% of your revenue ($${pnl.attributionGap?.toFixed(2)}) can't be attributed to specific ads. You're flying blind on which ads drive purchases. Fix: in Meta Ads, go to Ad → Edit → URL Parameters. Use Meta's URL Parameters field (not the URL directly) and insert: sub1={{ad.id}}&sub2={{adset.id}}&sub3={{campaign.id}}&sub4={{ad.name}}. This fix takes 5 minutes and will reveal exactly which creatives are generating revenue.`,
      tag: "Fix Today", color: "border-red-500/30 bg-red-500/5", tagColor: "text-red-400", priority: 0,
    });
  }

  // FB vs DB discrepancy
  if (pnl?.conversionComparison?.alert) {
    const fb = pnl.conversionComparison.fbReported;
    const db = pnl.conversionComparison.actualDB;
    tips.push({
      icon: AlertTriangle, title: `Meta reports ${fb} purchases but DB shows ${db} — pixel issue`,
      body: fb > db
        ? `Meta Ads Manager is overcounting by ${fb - db} purchases. This inflates your ROAS numbers and can cause over-spending. Root causes: (1) View-through attribution counting non-buyers, (2) Meta pixel firing multiple times on the thank-you page (check for duplicate pixel code), (3) Attribution window mismatch (Meta defaults to 7-day click + 1-day view). Recommendation: Switch Meta to 7-day click only attribution for cleaner data. Use your Railway DB numbers as ground truth.`
        : `Your Meta pixel is missing ${db - fb} actual purchases. This means Meta's algorithm isn't getting credit for all conversions, causing it to under-optimize. Check: (1) Is the Purchase pixel event firing on the thank-you page? Test via Meta Pixel Helper Chrome extension. (2) Is the thank-you page accessible without a login/redirect that blocks the pixel? (3) Check Events Manager → Diagnostics for any pixel errors.`,
      tag: "Pixel Issue", color: "border-orange-500/30 bg-orange-500/5", tagColor: "text-orange-400", priority: 1,
    });
  }

  // ATC drop-off
  if (campaignIns?.addToCart > 0 && campaignIns?.purchases > 0) {
    const atcToPurchaseRate = (campaignIns.purchases / campaignIns.addToCart) * 100;
    if (atcToPurchaseRate < 30) {
      tips.push({
        icon: ShoppingCart, title: `Only ${atcToPurchaseRate.toFixed(1)}% of cart adds convert — checkout friction`,
        body: `With ${campaignIns.addToCart} add-to-carts but only ${campaignIns.purchases} purchases, you're losing ${campaignIns.addToCart - campaignIns.purchases} potential buyers at checkout. Checkout friction fixes: (1) Reduce fields — first name, email, card only. (2) Add trust signals above the fold (secure checkout badge, money-back guarantee). (3) Add PayPal/Apple Pay as one-click options — reduces checkout abandonment by ~20%. (4) Show a progress bar. (5) Test cart abandonment email sequence (send 3 emails: 1hr, 24hr, 48hr). Even recovering 10% of abandoned carts would significantly lift revenue.`,
        tag: "Checkout Fix", color: "border-yellow-500/30 bg-yellow-500/5", tagColor: "text-yellow-400", priority: 1,
      });
    }
  }

  // CTR-based
  if (campaignIns?.ctr > 0) {
    if (campaignIns.ctr < 0.8) {
      tips.push({
        icon: MousePointer, title: "CTR below 0.8% — creative needs urgent refresh",
        body: `A CTR of ${campaignIns.ctr.toFixed(2)}% means your ad isn't stopping the scroll. In competitive niches like numerology, you need 1.5-3%+ CTR. Top-performing hooks for this niche: (1) "Your birth number reveals [specific outcome]" — identity-based hooks outperform generic spiritual content. (2) Use a pattern interrupt — odd numbers, unexpected visuals, direct questions. (3) Test video vs static: 15-second VSLs typically outperform static 2-3x for info products. (4) A/B test 3-5 different hooks simultaneously with $5-10/day each. Kill anything under 1% CTR after 1,000 impressions.`,
        tag: "Creative", color: "border-red-500/30 bg-red-500/5", tagColor: "text-red-400", priority: 1,
      });
    } else if (campaignIns.ctr >= 2) {
      tips.push({
        icon: Flame, title: `CTR at ${campaignIns.ctr.toFixed(2)}% — your creative is winning`,
        body: `Excellent click-through rate. This creative has strong resonance with your audience. Actions: (1) Scale this ad immediately — it has proven hooks. (2) Extract the winning elements (headline, visual, first 3 seconds) and create 3-5 variations. (3) Test this creative on new audiences: LAL 1% from purchasers, broad age 35-65, interest stacks. (4) Consider repurposing for YouTube ads or TikTok. (5) Document what makes this work for future creative briefs.`,
        tag: "Winner", color: "border-green-500/30 bg-green-500/5", tagColor: "text-green-400", priority: 2,
      });
    }
  }

  // CPA-based
  if (campaignIns?.costPerPurchase) {
    const cpa = campaignIns.costPerPurchase;
    const avgOrderValue = pnl?.dbRevenue && pnl?.dbPurchases ? pnl.dbRevenue / pnl.dbPurchases : 23;
    if (cpa > avgOrderValue) {
      tips.push({
        icon: DollarSign, title: `CPA ($${cpa.toFixed(2)}) exceeds avg order value — unprofitable`,
        body: `You're spending more to acquire customers than they're paying. With FB-reported CPA of $${cpa.toFixed(2)} and estimated AOV of $${avgOrderValue.toFixed(2)}, every sale loses money before upsells. Critical path to fix: (1) Increase AOV — add an order bump on checkout (+$7-17), test price anchoring ($37 crossed out → $17). (2) Implement post-purchase upsell funnel (Critical Dates Calendar → Living Forecast → Weekly email). Your DB shows ${pnl?.dbProducts?.length || 0} distinct products — maximize LTV. (3) Fix attribution bug so you know which ads are truly profitable. (4) Pause the bottom 30% of ad sets by CPA.`,
        tag: "Profitability", color: "border-red-500/40 bg-red-500/5", tagColor: "text-red-400", priority: 0,
      });
    }
  }

  // Frequency
  if (campaignIns?.frequency > 3) {
    tips.push({
      icon: Globe, title: `Frequency at ${campaignIns.frequency.toFixed(1)} — audience fatigued`,
      body: `Your audience has seen your ads ${campaignIns.frequency.toFixed(1)} times on average. Above 3.5x, CTR drops and CPMs spike. Actions: (1) Expand audience — switch top ad sets to broad targeting with advantage+ audience. (2) Launch fresh creative variants — same offer, different angle (try "therapist" hook if running "same type", or vice versa). (3) Add new audiences: LAL 3-5%, different interest stacks (astrology, personal development, self-help). (4) Consider excluding purchasers from the main campaign and running a separate retargeting campaign for them with upsell offers.`,
      tag: "Fatigue", color: "border-orange-500/30 bg-orange-500/5", tagColor: "text-orange-400", priority: 1,
    });
  }

  // Upsell optimization
  if (pnl?.dbFunnel?.view_upsell_1?.count > 0) {
    const upsellViews = pnl.dbFunnel.view_upsell_1.count;
    const upsellAccepts = pnl.dbFunnel.accept_upsell_1?.count || 0;
    const upsellRate = upsellViews > 0 ? (upsellAccepts / upsellViews) * 100 : 0;
    if (upsellRate < 15) {
      tips.push({
        icon: Package, title: `Upsell acceptance at ${upsellRate.toFixed(1)}% — optimize the offer`,
        body: `${upsellViews} buyers saw your upsell but only ${upsellAccepts} accepted (${upsellRate.toFixed(1)}%). Industry average for numerology/spirituality upsells is 20-35%. Optimization tactics: (1) Ensure the upsell is positioned as a natural next step, not a separate product. (2) Use a scarcity element ("This offer expires when you leave this page"). (3) Lower the price point — test $19 vs $27 vs $37. (4) Add a social proof element ("Join 2,847 numerology blueprint owners who also got…"). (5) A/B test headline: benefit-led ("Reveal your critical dates") vs urgency-led.`,
        tag: "Upsell", color: "border-purple-500/30 bg-purple-500/5", tagColor: "text-purple-400", priority: 2,
      });
    }
  }

  // LTV optimization
  if (pnl?.dbProducts) {
    const hasSubscriptions = pnl.dbProducts.some((p: any) => p.product?.includes("forecast") || p.product?.includes("subscription"));
    if (!hasSubscriptions || pnl.dbProducts.find((p: any) => p.product?.includes("forecast"))?.count < 3) {
      tips.push({
        icon: TrendingUp, title: "Low recurring revenue — maximize buyer LTV",
        body: `One-time purchases leave money on the table. Your Living Forecast subscription at $1 trial → $19/mo is your highest LTV product. To push more buyers into it: (1) Make the $1 trial the default/featured upsell (most buyers don't even see it). (2) Send a 3-part post-purchase email sequence pitching the subscription. (3) Add a "limited time trial" badge on the offer. (4) Retarget Blueprint buyers (from your pixel/email list) specifically with the forecast offer. One subscriber retained for 6 months = $114 revenue vs $17-29 one-time — this is the path to sustainable profitability.`,
        tag: "LTV", color: "border-teal-500/30 bg-teal-500/5", tagColor: "text-teal-400", priority: 2,
      });
    }
  }

  // Intl expansion
  if (rankings && rankings.length > 0) {
    const intlSets = rankings.filter(r =>
      r.name.toLowerCase().includes("intl") || r.name.toLowerCase().includes("spanish") ||
      r.name.toLowerCase().includes("portuguese") || r.name.toLowerCase().includes("french")
    );
    const usSet = rankings.find(r => !r.name.toLowerCase().includes("intl"));
    if (intlSets.length > 0 && usSet) {
      const bestIntl = intlSets.sort((a, b) => b.score - a.score)[0];
      if (bestIntl && bestIntl.score > usSet.score) {
        tips.push({
          icon: Globe, title: `International ad sets outperforming US — shift budget`,
          body: `${bestIntl.name.replace("Static - ", "")} has a score of ${bestIntl.score}/100 vs US campaign score of ${usSet.score}/100. Your LP auto-translates for Spanish, Portuguese, French, German, and Italian — this is a massive advantage. Emerging market numerology CPMs are 60-80% cheaper than US. If international CPA is below your target, consider: (1) Shifting 30-40% of budget to top international ad sets. (2) Testing a dedicated international campaign at $100-200/day. (3) Specifically tracking Spanish-speaking markets (MX, CO, AR) — numerology over-indexes there.`,
          tag: "Intl Scale", color: "border-cyan-500/30 bg-cyan-500/5", tagColor: "text-cyan-400", priority: 2,
        });
      }
    }
  }

  // Budget velocity
  if (campaignIns?.spend > 0 && pnl?.profit !== null) {
    tips.push({
      icon: Brain, title: "70/20/10 budget allocation strategy",
      body: `As a master media buyer, allocate budget across three buckets: (1) 70% to proven winners — ad sets with CPA below target and 50+ conversions. Scale these in 20% increments every 3 days to stay in Meta's learning phase. (2) 20% to testing — new creatives, new audiences, new angles. Run 5-10 tests simultaneously at $10-20/day each. Kill tests after 2,000 impressions if CTR < 1%. (3) 10% to retargeting — show a different offer/testimonial to users who clicked but didn't convert. Retargeting ROAS is typically 3-5x your cold traffic ROAS. This framework ensures you're always feeding the pipeline while protecting profitability.`,
      tag: "Strategy", color: "border-indigo-500/30 bg-indigo-500/5", tagColor: "text-indigo-400", priority: 3,
    });
  }

  return tips.sort((a, b) => a.priority - b.priority);
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Insights() {
  const [datePreset, setDatePreset] = useState("last_7d");
  const [campaignId, setCampaignId] = useState("");
  const [expandedRec, setExpandedRec] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<Severity | "all">("all");

  const { data: tokenData } = useQuery({
    queryKey: ["/api/token"],
    queryFn: () => apiRequest("GET", "/api/token").then(r => r.json()),
  });
  const hasToken = tokenData?.hasToken;

  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ["/api/campaigns", campaignId, "insights-analysis", datePreset],
    queryFn: () => apiRequest("GET", `/api/campaigns/${campaignId}/insights-analysis?date_preset=${datePreset}`).then(r => r.json()),
    enabled: hasToken && !!campaignId,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 4 * 60 * 1000,
  });

  // Also fetch P&L data to power enhanced suggestions
  const { data: pnlData } = useQuery({
    queryKey: ["/api/pnl", datePreset],
    queryFn: () => apiRequest("GET", `/api/pnl?date_preset=${datePreset}`).then(r => r.json()),
    enabled: hasToken,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  if (!hasToken) return (
    <div className="p-4 md:p-6">
      <h1 className="text-lg font-bold mb-6">Performance Insights</h1>
      <div className="bg-card border border-border rounded-lg p-10 text-center max-w-md mx-auto">
        <Activity size={22} className="mx-auto mb-3 text-muted-foreground" />
        <div className="text-sm font-semibold mb-2">Connect token to see insights</div>
        <div className="text-xs text-muted-foreground">Add your Meta API token to unlock full analysis.</div>
      </div>
    </div>
  );

  const { healthScore, funnel, rankings, recommendations, campaignIns } = data || {};
  const pnl = pnlData as any;

  const radarData = healthScore ? [
    { subject: "CTR",        value: Math.round(healthScore.ctr) },
    { subject: "Efficiency", value: Math.round(healthScore.efficiency) },
    { subject: "Conversion", value: Math.round(healthScore.conversion) },
    { subject: "Freshness",  value: Math.round(healthScore.fatigue) },
  ] : [];

  const filteredRecs = (recommendations || []).filter(
    (r: Rec) => severityFilter === "all" || r.severity === severityFilter
  );
  const counts = (recommendations || []).reduce((acc: Record<string, number>, r: Rec) => {
    acc[r.severity] = (acc[r.severity] || 0) + 1;
    return acc;
  }, {});

  const powerInsights = generatePowerInsights(campaignIns, rankings || [], pnl, funnel);

  // P&L quick stats for top bar
  const profit = pnl?.profit;
  const trueRoas = pnl?.trueRoas;

  return (
    <div className="p-4 md:p-6 space-y-5 pb-10 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Brain size={18} className="text-primary" />
            Master Buyer Intelligence
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time analysis · P&amp;L aware · Affiliate-grade insights · Refreshes every 5 min
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {dataUpdatedAt ? (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock size={11} />
              {Math.round((Date.now() - dataUpdatedAt) / 60000) <= 0 ? "just now" : `${Math.round((Date.now() - dataUpdatedAt) / 60000)}m ago`}
            </span>
          ) : null}
          <CampaignPicker value={campaignId} onChange={setCampaignId} includeAll />
          <DatePresetPicker value={datePreset} onChange={setDatePreset} />
        </div>
      </div>

      {/* P&L Quick Status Bar */}
      {pnl && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "True ROAS", value: trueRoas !== null ? `${trueRoas.toFixed(2)}x` : "—",
              color: trueRoas !== null ? (trueRoas >= 1.5 ? "text-green-400" : trueRoas >= 1 ? "text-yellow-400" : "text-red-400") : "text-foreground",
              icon: Activity,
            },
            {
              label: "Profit/Loss", value: profit !== null ? `${profit >= 0 ? "+" : ""}$${Math.abs(profit).toFixed(2)}` : "—",
              color: profit !== null ? (profit >= 0 ? "text-green-400" : "text-red-400") : "text-foreground",
              icon: profit !== null && profit >= 0 ? TrendingUp : TrendingDown,
            },
            {
              label: "FB vs DB Conv", value: pnl.conversionComparison?.fbReported !== undefined
                ? `${pnl.conversionComparison.fbReported} / ${pnl.conversionComparison.actualDB}`
                : "—",
              color: pnl.conversionComparison?.alert ? "text-yellow-400" : "text-green-400",
              icon: pnl.conversionComparison?.alert ? AlertTriangle : CheckCircle2,
            },
            {
              label: "Attribution Gap", value: pnl.attributionGapPct > 0 ? `${pnl.attributionGapPct.toFixed(1)}%` : "0%",
              color: pnl.attributionGapPct > 20 ? "text-red-400" : pnl.attributionGapPct > 5 ? "text-yellow-400" : "text-green-400",
              icon: Bug,
            },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="bg-card border border-border rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Icon size={11} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
              <div className={`text-base font-bold ${color}`}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-card border border-border rounded-lg animate-pulse" />)}
        </div>
      ) : !data || data.error ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <Info size={24} className="mx-auto mb-3 text-muted-foreground" />
          <div className="text-sm text-muted-foreground">
            {!campaignId ? "Select a campaign above to load insights." : data?.error === "No token" ? "Token expired — reconnect in the sidebar." : "No data for this period yet. Select a campaign and date range."}
          </div>
        </div>
      ) : (
        <>
          {/* ── Section 1: Campaign Health Score ── */}
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Target size={14} className="text-primary" />
              Campaign Health Score
            </div>
            <div className="flex flex-col md:flex-row gap-6 items-center">
              <HealthGauge score={healthScore?.overall || 0} />
              <div className="flex-1 w-full" style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} outerRadius={70}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Radar name="Score" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "12px" }} formatter={(v: any) => [`${v}/100`]} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-3 min-w-0 w-full">
                {[
                  { label: "Click-Through Rate", value: healthScore?.ctr || 0, color: "bg-blue-500" },
                  { label: "Cost Efficiency (CPC)", value: healthScore?.efficiency || 0, color: "bg-green-500" },
                  { label: "Conversion Performance", value: healthScore?.conversion || 0, color: "bg-purple-500" },
                  { label: "Creative Freshness", value: healthScore?.fatigue || 0, color: "bg-amber-500" },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="text-foreground font-mono">{Math.round(value)}</span>
                    </div>
                    <ScoreBar value={value} color={color} />
                  </div>
                ))}
              </div>
            </div>
            {campaignIns && (
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 mt-5 pt-4 border-t border-border">
                {[
                  { label: "Spend", value: fmt(campaignIns.spend, "$") },
                  { label: "CTR", value: fmt(campaignIns.ctr, "", "%"), good: campaignIns.ctr >= 1, bad: campaignIns.ctr < 0.8 },
                  { label: "CPC", value: fmt(campaignIns.cpc, "$"), good: campaignIns.cpc <= 1.5, bad: campaignIns.cpc > 3 },
                  { label: "Add to Cart", value: fmtInt(campaignIns.addToCart), good: campaignIns.addToCart > 0 },
                  { label: "Checkout", value: fmtInt(campaignIns.initiateCheckout), good: campaignIns.initiateCheckout > 0 },
                  { label: "Purchases (FB)", value: String(campaignIns.purchases), good: campaignIns.purchases > 0, bad: campaignIns.purchases === 0 },
                ].map(({ label, value, good, bad }) => (
                  <div key={label} className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">{label}</div>
                    <div className={`text-sm font-bold ${good ? "text-green-400" : bad ? "text-red-400" : "text-foreground"}`}>{value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Section 2: Conversion Funnel (Meta Pixel) ── */}
          {funnel && (
            <div className="bg-card border border-border rounded-lg p-5">
              <div className="text-sm font-semibold mb-4 flex items-center gap-2">
                <BarChart3 size={14} className="text-primary" />
                Meta Pixel Funnel
                {campaignIns?.addToCart > 0 && (
                  <Badge variant="outline" className="text-xs ml-1 text-green-400 border-green-500/30">
                    ATC: {fmtInt(campaignIns.addToCart)}
                  </Badge>
                )}
              </div>
              <div className="flex items-stretch gap-2 overflow-x-auto pb-1">
                <FunnelStep label="Impressions" value={funnel.impressions} rate={funnel.impressionToClick} />
                <FunnelStep label="Clicks" value={funnel.clicks} rate={funnel.clickToLanding} />
                {campaignIns?.addToCart > 0 && (
                  <FunnelStep label="Add to Cart"
                    value={campaignIns.addToCart}
                    rate={campaignIns.initiateCheckout > 0 ? ((campaignIns.initiateCheckout / campaignIns.addToCart) * 100).toFixed(1) : null} />
                )}
                {campaignIns?.initiateCheckout > 0 && (
                  <FunnelStep label="Initiate Checkout"
                    value={campaignIns.initiateCheckout}
                    rate={funnel.purchases > 0 ? ((funnel.purchases / campaignIns.initiateCheckout) * 100).toFixed(1) : null} />
                )}
                {funnel.landingViews > 0 && !campaignIns?.addToCart && (
                  <FunnelStep label="Landing Views" value={funnel.landingViews} rate={funnel.landingToPurchase} />
                )}
                <FunnelStep label="Purchases (FB)" value={funnel.purchases} isLast highlight />
              </div>
              {pnl?.conversionComparison && (
                <div className="mt-3 flex items-start gap-2 p-3 bg-secondary/40 rounded-lg text-xs">
                  <Info size={12} className="text-muted-foreground mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">
                    FB reports <strong className="text-foreground">{pnl.conversionComparison.fbReported}</strong> purchases.
                    Your DB shows <strong className={pnl.conversionComparison.alert ? "text-yellow-400" : "text-green-400"}>
                      {pnl.conversionComparison.actualDB}
                    </strong> actual.
                    {pnl.conversionComparison.alert && " — discrepancy detected, see P&L page for details."}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ── Section 3: Power Insights ── */}
          {powerInsights.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-5">
              <div className="text-sm font-semibold mb-1 flex items-center gap-2">
                <Brain size={14} className="text-primary" />
                Master Buyer Intelligence
                <Badge variant="outline" className="text-xs ml-1">
                  {powerInsights.length} insights
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Data-driven analysis combining Meta spend, actual DB revenue, RedTrack attribution, and funnel behavior.
                Sorted by business impact.
              </p>
              <div className="space-y-3">
                {powerInsights.map((insight, i) => (
                  <PowerInsight key={i} {...insight} />
                ))}
              </div>
            </div>
          )}

          {/* ── Section 4: Ad Set Rankings ── */}
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Star size={14} className="text-primary" />
              Ad Set Rankings
            </div>
            <div className="space-y-2">
              {(rankings || []).map((r: Ranking, i: number) => (
                <div key={r.id} data-testid={`ranking-row-${r.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-secondary/30 transition-colors">
                  <div className="text-xs text-muted-foreground font-mono w-4 shrink-0">#{i + 1}</div>
                  <GradeCircle grade={r.grade} score={r.score} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground truncate">
                        {r.name.replace("Static - ", "")}
                      </span>
                      {r.angle && (
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${ANGLE_COLORS[r.angle] || "bg-secondary text-muted-foreground"}`}>
                          {ANGLE_LABELS[r.angle] || r.angle}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                      <span>CTR <span className="text-foreground font-mono">{r.ctr > 0 ? `${r.ctr.toFixed(2)}%` : "—"}</span></span>
                      <span>CPC <span className="text-foreground font-mono">{r.cpc > 0 ? `$${r.cpc.toFixed(2)}` : "—"}</span></span>
                      <span>Spend <span className="text-foreground font-mono">{r.spend > 0 ? `$${r.spend.toFixed(2)}` : "—"}</span></span>
                      <span>Purchases <span className="text-foreground font-mono">{r.purchases}</span></span>
                    </div>
                    <div className="mt-1.5 w-full max-w-[120px]">
                      <ScoreBar value={r.score}
                        color={r.grade === "A" ? "bg-green-500" : r.grade === "B" ? "bg-blue-500" : r.grade === "C" ? "bg-yellow-500" : "bg-red-500"} />
                    </div>
                  </div>
                  <div className="shrink-0">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full border ${
                      r.recommendation === "Scale"  ? "text-green-400 border-green-500/30 bg-green-500/10"
                      : r.recommendation === "Hold" ? "text-blue-400 border-blue-500/30 bg-blue-500/10"
                      : r.recommendation === "Review" ? "text-yellow-400 border-yellow-500/30 bg-yellow-500/10"
                      : "text-muted-foreground border-border"
                    }`}>
                      {r.recommendation}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Section 5: Action Items ── */}
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="text-sm font-semibold flex items-center gap-2">
                <Zap size={14} className="text-primary" />
                Action Items
                <span className="text-xs text-muted-foreground font-normal">({filteredRecs.length} of {recommendations?.length || 0})</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {(["all", "critical", "warning", "opportunity", "good"] as const).map((s) => (
                  <button key={s} onClick={() => setSeverityFilter(s)} data-testid={`filter-${s}`}
                    className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                      severityFilter === s
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                    }`}>
                    {s === "all" ? `All (${recommendations?.length || 0})` : `${s} ${counts[s] ? `(${counts[s]})` : ""}`}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              {filteredRecs.length === 0
                ? <div className="text-center py-8 text-sm text-muted-foreground">No items for this filter.</div>
                : filteredRecs.map((rec: Rec) => (
                    <RecCard key={rec.id} rec={rec} expanded={expandedRec === rec.id}
                      onToggle={() => setExpandedRec(expandedRec === rec.id ? null : rec.id)} />
                  ))
              }
            </div>
          </div>

          {/* ── Section 6: Optimization Cadence ── */}
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="text-sm font-semibold mb-4 flex items-center gap-2">
              <TrendingUp size={14} className="text-primary" />
              Optimization Cadence
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                {
                  freq: "Daily", color: "border-red-500/30 bg-red-500/5", badge: "text-red-400",
                  items: ["Monitor for ad disapprovals", "Check budget pacing", "Flag frequency spikes >3.5x", "Review P&L — is today profitable?"],
                },
                {
                  freq: "Weekly", color: "border-yellow-500/30 bg-yellow-500/5", badge: "text-yellow-400",
                  items: ["Pause ad sets below 0.5% CTR", "Scale sets with CPA under target", "Compare FB vs DB conversions", "Fix any attribution issues in RT"],
                },
                {
                  freq: "Bi-Weekly", color: "border-blue-500/30 bg-blue-500/5", badge: "text-blue-400",
                  items: ["Refresh creative variants", "Test new hook or angle", "Review upsell acceptance rates", "Audit checkout abandon rate"],
                },
                {
                  freq: "Monthly", color: "border-green-500/30 bg-green-500/5", badge: "text-green-400",
                  items: ["Full P&L review", "70/20/10 budget reallocation", "Creative strategy reset", "Pixel health check in Events Manager", "LTV analysis by cohort"],
                },
              ].map(({ freq, color, badge, items }) => (
                <div key={freq} className={`rounded-lg border p-4 ${color}`}>
                  <div className={`text-xs font-bold mb-3 ${badge}`}>{freq}</div>
                  <ul className="space-y-1.5">
                    {items.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 size={11} className="mt-0.5 shrink-0 text-muted-foreground/50" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
