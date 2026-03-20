import { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ComposableMap, Geographies, Geography, ZoomableGroup, Marker } from "react-simple-maps";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// ISO Alpha-2 → numeric (UN M49) mapping for world-atlas
const ALPHA2_TO_NUMERIC: Record<string, string> = {
  AF:"004",AL:"008",DZ:"012",AD:"020",AO:"024",AG:"028",AR:"032",AM:"051",AU:"036",AT:"040",AZ:"031",
  BS:"044",BH:"048",BD:"050",BB:"052",BY:"112",BE:"056",BZ:"084",BJ:"204",BT:"064",BO:"068",
  BA:"070",BW:"072",BR:"076",BN:"096",BG:"100",BF:"854",BI:"108",CV:"132",KH:"116",CM:"120",
  CA:"124",CF:"140",TD:"148",CL:"152",CN:"156",CO:"170",KM:"174",CD:"180",CG:"178",CR:"188",
  HR:"191",CU:"192",CY:"196",CZ:"203",DK:"208",DJ:"262",DM:"212",DO:"214",EC:"218",EG:"818",
  SV:"222",GQ:"226",ER:"232",EE:"233",SZ:"748",ET:"231",FJ:"242",FI:"246",FR:"250",GA:"266",
  GM:"270",GE:"268",DE:"276",GH:"288",GR:"300",GD:"308",GT:"320",GN:"324",GW:"624",GY:"328",
  HT:"332",HN:"340",HU:"348",IS:"352",IN:"356",ID:"360",IR:"364",IQ:"368",IE:"372",IL:"376",
  IT:"380",JM:"388",JP:"392",JO:"400",KZ:"398",KE:"404",KI:"296",KW:"414",KG:"417",LA:"418",
  LV:"428",LB:"422",LS:"426",LR:"430",LY:"434",LI:"438",LT:"440",LU:"442",MG:"450",MW:"454",
  MY:"458",MV:"462",ML:"466",MT:"470",MH:"584",MR:"478",MU:"480",MX:"484",FM:"583",MD:"498",
  MC:"492",MN:"496",ME:"499",MA:"504",MZ:"508",MM:"104",NA:"516",NR:"520",NP:"524",NL:"528",
  NZ:"554",NI:"558",NE:"562",NG:"566",NO:"578",OM:"512",PK:"586",PW:"585",PA:"591",PG:"598",
  PY:"600",PE:"604",PH:"608",PL:"616",PT:"620",QA:"634",RO:"642",RU:"643",RW:"646",KN:"659",
  LC:"662",VC:"670",WS:"882",SM:"674",ST:"678",SA:"682",SN:"686",RS:"688",SC:"690",SL:"694",
  SG:"702",SK:"703",SI:"705",SB:"090",SO:"706",ZA:"710",SS:"728",ES:"724",LK:"144",SD:"729",
  SR:"740",SE:"752",CH:"756",SY:"760",TW:"158",TJ:"762",TZ:"834",TH:"764",TL:"626",TG:"768",
  TO:"776",TT:"780",TN:"788",TR:"792",TM:"795",TV:"798",UG:"800",UA:"804",AE:"784",GB:"826",
  US:"840",UY:"858",UZ:"860",VU:"548",VE:"862",VN:"704",YE:"887",ZM:"894",ZW:"716",
  MK:"807",XK:"383",PS:"275",
};

// Approximate centroids for marker pins on profitable countries
const COUNTRY_CENTROIDS: Record<string, [number, number]> = {
  US:[-98,38],GB:[-2,54],CA:[-96,60],AU:[133,-27],DE:[10,51],FR:[2,46],IT:[12,42],ES:[-4,40],
  BR:[-53,-10],MX:[-102,23],AR:[-64,-34],CO:[-74,4],CL:[-71,-30],PE:[-76,-10],EC:[-78,-2],
  NL:[5,52],BE:[4,51],CH:[8,47],AT:[14,47],SE:[15,62],NO:[10,62],DK:[10,56],FI:[26,64],
  PL:[20,52],CZ:[16,50],HU:[19,47],RO:[25,46],GR:[22,39],PT:[-8,39],IE:[-8,53],
  JP:[138,36],KR:[128,36],SG:[104,1],MY:[110,3],TH:[101,15],PH:[122,12],ID:[118,-5],
  ZA:[25,-29],NG:[8,10],EG:[30,27],MA:[-7,31],SN:[-14,14],
  AE:[54,24],IN:[78,20],TW:[121,24],HK:[114,22],
  DO:[-70,18],CR:[-84,10],PA:[-80,9],GT:[-90,15],HN:[-87,15],SV:[-89,14],NI:[-85,13],
  UY:[-56,-33],PY:[-58,-23],BO:[-65,-17],VE:[-66,8],
  RS:[21,44],HR:[16,45],SK:[19,49],BG:[25,43],LT:[24,56],LV:[25,57],EE:[25,59],
};

export interface CountryDatum {
  countryCode: string;
  country: string;
  spend: number;
  purchases: number;
  clicks: number;
  ctr: number;
  cpc: number;
  language: string;
}

interface Props {
  countries: CountryDatum[];
}

// Flag emoji from ISO Alpha-2
function flag(code: string): string {
  if (!code || code.length !== 2) return "🌍";
  const upper = code.toUpperCase();
  const pts = [0x1F1E6 + upper.charCodeAt(0) - 65, 0x1F1E6 + upper.charCodeAt(1) - 65];
  return String.fromCodePoint(pts[0], pts[1]);
}

function fmt(n: number, dec = 2) {
  return n.toLocaleString("en-US", { maximumFractionDigits: dec, minimumFractionDigits: dec });
}

// Color logic — spend intensity drives brightness for profitable countries
function getCountryColor(d: CountryDatum | undefined, maxSpend: number): string {
  if (!d || d.spend === 0) return "hsl(220,18%,18%)";
  if (d.purchases > 0) {
    // Scale lightness 34%→52% based on spend
    const t = Math.min(1, d.spend / Math.max(1, maxSpend));
    const l = 32 + Math.round(t * 22);
    return `hsl(145,62%,${l}%)`;
  }
  // Spend but no conversions — red, intensity by spend
  const t = Math.min(1, d.spend / Math.max(1, maxSpend));
  const l = 30 + Math.round(t * 18);
  return `hsl(2,72%,${l}%)`;
}

function getHoverColor(d: CountryDatum | undefined): string {
  if (!d) return "hsl(220,18%,30%)";
  if (d.purchases > 0) return "hsl(145,75%,58%)";
  if (d.spend > 0) return "hsl(2,85%,60%)";
  return "hsl(220,18%,30%)";
}

function getStroke(d: CountryDatum | undefined): string {
  if (!d || d.spend === 0) return "hsl(220,18%,26%)";
  if (d.purchases > 0) return "hsl(145,65%,50%)";
  return "hsl(2,72%,52%)";
}

export default function WorldMap({ countries }: Props) {
  const [tooltip, setTooltip] = useState<{
    x: number; y: number; datum: CountryDatum;
  } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Slight delay so the map SVG is rendered before we trigger animations
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  const dataByNumeric = useMemo(() => {
    const map: Record<string, CountryDatum> = {};
    for (const c of countries) {
      const numeric = ALPHA2_TO_NUMERIC[c.countryCode.toUpperCase()];
      if (numeric) map[numeric] = c;
    }
    return map;
  }, [countries]);

  const dataByAlpha2 = useMemo(() => {
    const map: Record<string, CountryDatum> = {};
    for (const c of countries) map[c.countryCode.toUpperCase()] = c;
    return map;
  }, [countries]);

  const maxSpend = useMemo(
    () => Math.max(1, ...countries.map(c => c.spend)),
    [countries]
  );

  const profitable = useMemo(() => countries.filter(c => c.purchases > 0), [countries]);
  const spending   = useMemo(() => countries.filter(c => c.spend > 0 && c.purchases === 0), [countries]);

  // Top 5 profitable by purchases for pins
  const topCountries = useMemo(
    () => [...profitable].sort((a, b) => b.purchases - a.purchases).slice(0, 5),
    [profitable]
  );

  return (
    <div className="relative w-full select-none" ref={containerRef}>

      {/* === Animated Legend === */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="flex flex-wrap items-center gap-4 mb-3 px-1"
      >
        <LegendDot color="hsl(145,62%,38%)" label={`Profitable`} count={profitable.length} pulse />
        <LegendDot color="hsl(2,72%,40%)"   label={`Spend / No Conv.`} count={spending.length} />
        <LegendDot color="hsl(220,18%,22%)" label="Not Targeted" />
        <div className="ml-auto text-xs text-muted-foreground hidden sm:block opacity-60">
          Scroll to zoom · Drag to pan · Hover for details
        </div>
      </motion.div>

      {/* === Map Container === */}
      <div
        className="w-full rounded-xl overflow-hidden border border-white/5 relative"
        style={{
          aspectRatio: "16/7",
          background: "radial-gradient(ellipse at 50% 60%, hsl(220,28%,9%) 0%, hsl(220,22%,6%) 100%)",
          boxShadow: "0 0 60px hsl(220,30%,5%) inset, 0 2px 40px rgba(0,0,0,0.6)",
        }}
        onMouseLeave={() => { setTooltip(null); setHoveredCode(null); }}
      >
        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none z-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(210,80%,70%) 1px, transparent 1px), linear-gradient(90deg, hsl(210,80%,70%) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Glow halo for profitable countries — behind map */}
        <div className="absolute inset-0 pointer-events-none z-0">
          {profitable.length > 0 && (
            <div
              className="absolute inset-0 opacity-10"
              style={{
                background: "radial-gradient(ellipse 60% 40% at 40% 55%, hsl(145,60%,45%), transparent)",
              }}
            />
          )}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: mounted ? 1 : 0 }}
          transition={{ duration: 0.7 }}
          className="w-full h-full relative z-10"
        >
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{ scale: 120, center: [10, 20] }}
            style={{ width: "100%", height: "100%" }}
          >
            <ZoomableGroup zoom={1} minZoom={0.8} maxZoom={8}>
              <Geographies geography={GEO_URL}>
                {({ geographies }) =>
                  geographies.map((geo, idx) => {
                    const numId = String(geo.id);
                    const d = dataByNumeric[numId];
                    const fill = getCountryColor(d, maxSpend);
                    const stroke = getStroke(d);
                    const isHovered = d && hoveredCode === d.countryCode;

                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={isHovered ? getHoverColor(d) : fill}
                        stroke={stroke}
                        strokeWidth={d && d.spend > 0 ? 0.6 : 0.3}
                        style={{
                          default: {
                            outline: "none",
                            transition: "fill 0.18s ease, filter 0.18s ease",
                            filter: d?.purchases
                              ? `drop-shadow(0 0 3px hsl(145,65%,45%)`
                              : "none",
                          },
                          hover: {
                            outline: "none",
                            filter: d?.purchases
                              ? "drop-shadow(0 0 6px hsl(145,75%,60%))"
                              : d?.spend
                                ? "drop-shadow(0 0 5px hsl(2,85%,60%))"
                                : "none",
                            cursor: d ? "pointer" : "default",
                          },
                          pressed: { outline: "none" },
                        }}
                        onMouseEnter={(evt) => {
                          if (!d) return;
                          setHoveredCode(d.countryCode);
                          setTooltip({ x: evt.clientX, y: evt.clientY, datum: d });
                        }}
                        onMouseMove={(evt) => {
                          if (d) setTooltip(t => t ? { ...t, x: evt.clientX, y: evt.clientY } : null);
                        }}
                        onMouseLeave={() => {
                          setTooltip(null);
                          setHoveredCode(null);
                        }}
                      />
                    );
                  })
                }
              </Geographies>

              {/* Animated pins on top profitable countries */}
              {mounted && topCountries.map((c, i) => {
                const coords = COUNTRY_CENTROIDS[c.countryCode];
                if (!coords) return null;
                return (
                  <Marker key={c.countryCode} coordinates={coords}>
                    {/* Pulse ring */}
                    <circle
                      r={5}
                      fill="none"
                      stroke="hsl(145,75%,55%)"
                      strokeWidth={1.5}
                      opacity={0.7}
                      style={{
                        animation: `mapPulse ${1.4 + i * 0.2}s ease-out infinite`,
                        transformOrigin: "center",
                      }}
                    />
                    {/* Center dot */}
                    <circle
                      r={2.5}
                      fill="hsl(145,75%,55%)"
                      stroke="hsl(220,20%,8%)"
                      strokeWidth={0.8}
                    />
                  </Marker>
                );
              })}
            </ZoomableGroup>
          </ComposableMap>
        </motion.div>

        {/* Loading shimmer if not mounted */}
        {!mounted && (
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="hsl(145,60%,45%)" strokeWidth="3" strokeLinecap="round" />
              </svg>
              Loading map…
            </div>
          </div>
        )}
      </div>

      {/* === Rich Floating Tooltip === */}
      <AnimatePresence>
        {tooltip && (
          <motion.div
            key="tooltip"
            initial={{ opacity: 0, scale: 0.92, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 4 }}
            transition={{ duration: 0.12 }}
            className="fixed z-[9999] pointer-events-none"
            style={{ left: tooltip.x + 14, top: tooltip.y - 10 }}
          >
            <div
              className="rounded-xl border shadow-2xl text-xs overflow-hidden"
              style={{
                background: "hsl(220,22%,11%)",
                borderColor: tooltip.datum.purchases > 0
                  ? "hsl(145,50%,35%)"
                  : tooltip.datum.spend > 0
                    ? "hsl(2,60%,38%)"
                    : "hsl(220,18%,26%)",
                minWidth: 190,
                boxShadow: tooltip.datum.purchases > 0
                  ? "0 8px 30px rgba(0,0,0,0.5), 0 0 12px hsl(145,60%,30%)"
                  : "0 8px 30px rgba(0,0,0,0.5)",
              }}
            >
              {/* Header */}
              <div
                className="px-3 py-2 flex items-center gap-2 border-b"
                style={{
                  borderColor: "hsl(220,18%,20%)",
                  background: tooltip.datum.purchases > 0
                    ? "hsl(145,40%,13%)"
                    : tooltip.datum.spend > 0
                      ? "hsl(2,40%,13%)"
                      : "hsl(220,18%,15%)",
                }}
              >
                <span className="text-base leading-none">{flag(tooltip.datum.countryCode)}</span>
                <div>
                  <div className="font-semibold text-foreground leading-tight">{tooltip.datum.country}</div>
                  <div className="text-muted-foreground opacity-70 text-[10px]">{tooltip.datum.language}</div>
                </div>
                <div className="ml-auto">
                  {tooltip.datum.purchases > 0 ? (
                    <span className="text-[10px] font-semibold text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded-md">
                      ✓ Profitable
                    </span>
                  ) : tooltip.datum.spend > 0 ? (
                    <span className="text-[10px] font-semibold text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded-md">
                      No Conv.
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Stats grid */}
              <div className="px-3 py-2 grid grid-cols-2 gap-x-4 gap-y-1">
                <TooltipStat label="Spend" value={`$${fmt(tooltip.datum.spend)}`} />
                <TooltipStat label="Clicks" value={tooltip.datum.clicks.toLocaleString()} />
                <TooltipStat label="CTR" value={`${fmt(tooltip.datum.ctr)}%`}
                  color={tooltip.datum.ctr >= 2 ? "text-green-400" : tooltip.datum.ctr >= 1 ? "text-yellow-400" : undefined} />
                <TooltipStat label="CPC" value={tooltip.datum.cpc > 0 ? `$${fmt(tooltip.datum.cpc)}` : "—"}
                  color={tooltip.datum.cpc > 0 && tooltip.datum.cpc <= 1 ? "text-green-400" : undefined} />
                {tooltip.datum.purchases > 0 && (
                  <>
                    <TooltipStat label="Purchases" value={tooltip.datum.purchases.toString()} color="text-green-400" />
                    <TooltipStat label="CPA" value={`$${fmt(tooltip.datum.spend / tooltip.datum.purchases)}`} />
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CSS keyframes for pulse rings */}
      <style>{`
        @keyframes mapPulse {
          0%   { r: 3; opacity: 0.9; }
          70%  { r: 10; opacity: 0; }
          100% { r: 10; opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LegendDot({ color, label, count, pulse }: {
  color: string; label: string; count?: number; pulse?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="relative w-3 h-3 rounded-sm shrink-0 flex items-center justify-center" style={{ background: color }}>
        {pulse && (
          <div
            className="absolute inset-0 rounded-sm"
            style={{
              background: color,
              animation: "legendPulse 2.2s ease-in-out infinite",
            }}
          />
        )}
      </div>
      <span className="text-xs text-muted-foreground">
        {label}
        {count !== undefined && (
          <span className="ml-1 text-foreground font-semibold">{count}</span>
        )}
      </span>
      <style>{`
        @keyframes legendPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(1.4); }
        }
      `}</style>
    </div>
  );
}

function TooltipStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div className="text-[10px] text-muted-foreground opacity-60 uppercase tracking-wide">{label}</div>
      <div className={`font-semibold tabular-nums ${color || "text-foreground"}`}>{value}</div>
    </div>
  );
}
