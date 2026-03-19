import { useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { Tooltip } from "@/components/ui/tooltip";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// ISO Alpha-2 → numeric (UN M49) mapping for world-atlas
// world-atlas uses ISO 3166-1 numeric codes. We map our Alpha-2 codes → numeric.
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

export interface CountryDatum {
  countryCode: string; // ISO Alpha-2
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

function getCountryColor(d: CountryDatum | undefined): string {
  if (!d || d.spend === 0) return "hsl(220 18% 22%)"; // no data — dark gray
  if (d.purchases > 0) return "hsl(145 60% 40%)";     // profitable — green
  return "hsl(0 70% 45%)";                              // spend but no conversions — red
}

function getCountryStroke(d: CountryDatum | undefined): string {
  if (!d) return "hsl(220 18% 28%)";
  if (d.purchases > 0) return "hsl(145 60% 55%)";
  if (d.spend > 0) return "hsl(0 70% 60%)";
  return "hsl(220 18% 30%)";
}

export default function WorldMap({ countries }: Props) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);

  // Build a map from numeric code → CountryDatum for fast lookup
  const dataByNumeric = useMemo(() => {
    const map: Record<string, CountryDatum> = {};
    for (const c of countries) {
      const numeric = ALPHA2_TO_NUMERIC[c.countryCode.toUpperCase()];
      if (numeric) map[numeric] = c;
    }
    return map;
  }, [countries]);

  const profitable = useMemo(() => countries.filter(c => c.purchases > 0).length, [countries]);
  const spending = useMemo(() => countries.filter(c => c.spend > 0 && c.purchases === 0).length, [countries]);

  return (
    <div className="relative w-full">
      {/* Legend */}
      <div className="flex items-center gap-4 mb-3 px-1">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: "hsl(145 60% 40%)" }} />
          <span className="text-xs text-muted-foreground">Profitable ({profitable})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: "hsl(0 70% 45%)" }} />
          <span className="text-xs text-muted-foreground">Spend / No Conv. ({spending})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: "hsl(220 18% 22%)" }} />
          <span className="text-xs text-muted-foreground">No Data</span>
        </div>
      </div>

      {/* Map */}
      <div
        className="w-full rounded-lg overflow-hidden bg-[hsl(220,18%,10%)] border border-border"
        style={{ aspectRatio: "16/7" }}
        onMouseLeave={() => setTooltip(null)}
      >
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ scale: 120, center: [10, 20] }}
          style={{ width: "100%", height: "100%" }}
        >
          <ZoomableGroup zoom={1} minZoom={0.8} maxZoom={6}>
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const numId = String(geo.id);
                  const d = dataByNumeric[numId];
                  const fill = getCountryColor(d);
                  const stroke = getCountryStroke(d);
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={0.4}
                      style={{
                        default: { outline: "none" },
                        hover: {
                          fill: d
                            ? d.purchases > 0
                              ? "hsl(145 70% 52%)"
                              : d.spend > 0
                                ? "hsl(0 80% 58%)"
                                : "hsl(220 18% 32%)"
                            : "hsl(220 18% 32%)",
                          outline: "none",
                          cursor: d ? "pointer" : "default",
                        },
                        pressed: { outline: "none" },
                      }}
                      onMouseEnter={(evt) => {
                        if (!d) return;
                        const fmt = (n: number, dec = 2) =>
                          n.toLocaleString("en-US", { maximumFractionDigits: dec, minimumFractionDigits: dec });
                        const lines = [
                          `${d.country} (${d.countryCode})`,
                          `Spend: $${fmt(d.spend)}  •  ${d.language}`,
                          `Clicks: ${d.clicks.toLocaleString()}  •  CTR: ${fmt(d.ctr)}%`,
                          d.purchases > 0
                            ? `✅ ${d.purchases} purchase${d.purchases > 1 ? "s" : ""}  •  CPA: $${d.purchases > 0 ? fmt(d.spend / d.purchases) : "—"}`
                            : "❌ No conversions yet",
                        ].join("\n");
                        setTooltip({ x: evt.clientX, y: evt.clientY, content: lines });
                      }}
                      onMouseMove={(evt) => {
                        if (tooltip) setTooltip(t => t ? { ...t, x: evt.clientX, y: evt.clientY } : null);
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  );
                })
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none rounded-lg border border-border shadow-xl text-xs"
          style={{
            left: tooltip.x + 12,
            top: tooltip.y - 10,
            background: "hsl(220 20% 12%)",
            padding: "8px 12px",
            maxWidth: 220,
          }}
        >
          {tooltip.content.split("\n").map((line, i) => (
            <div key={i} className={i === 0 ? "font-semibold text-foreground mb-1" : "text-muted-foreground"}>
              {line}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-2 text-center">
        Scroll to zoom · Drag to pan · Hover for details
      </p>
    </div>
  );
}
