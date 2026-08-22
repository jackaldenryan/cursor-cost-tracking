import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AUTO_BILLING_NOTE, formatPct, formatUsd, OTHER_MODEL } from "./aggregation";
import type { SpendBucket, SpendSegment } from "./types";

const MODEL_COLORS = [
  "#3d9cf0",
  "#f0a03d",
  "#5bd38a",
  "#e06c75",
  "#c678dd",
  "#56b6c2",
  "#e5c07b",
  "#98c379",
  "#d19a66",
  "#61afef",
  "#be5046",
  "#528bff",
  "#e06c9f",
  "#7ec699",
  "#c9a227",
  "#a3b8ff",
  "#ff8b6b",
  "#4fd1c5",
  "#c084fc",
  "#f472b6",
];

const OTHER_COLOR = "#8b919c";

type ChartRow = SpendBucket & Record<string, string | number | SpendSegment[]>;

type SpendChartProps = {
  buckets: SpendBucket[];
};

export function SpendChart({ buckets }: SpendChartProps) {
  const tickEvery = buckets.length > 20 ? Math.ceil(buckets.length / 12) - 1 : 0;
  const maxSegments = Math.max(1, ...buckets.map((bucket) => bucket.segments.length));
  const colors = colorMap(buckets);
  const legend = [...colors.entries()].map(([model, color]) => ({ model, color }));
  const rows: ChartRow[] = buckets.map((bucket) => {
    const row: ChartRow = { ...bucket };
    bucket.segments.forEach((segment, index) => {
      row[`s${index}`] = segment.spend;
    });
    return row;
  });

  return (
    <div className="chart-stack">
      <div className="chart-frame">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="label"
              tick={{ fill: "#8b919c", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval={tickEvery}
              angle={-40}
              textAnchor="end"
              height={48}
            />
            <YAxis
              tickFormatter={(value: number) => formatUsd(value)}
              tick={{ fill: "#8b919c", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={64}
            />
            <Tooltip
              shared={false}
              cursor={{ fill: "rgba(61,156,240,0.08)" }}
              content={<SpendTooltip />}
            />
            {Array.from({ length: maxSegments }, (_, index) => (
              <Bar
                key={index}
                dataKey={`s${index}`}
                stackId="spend"
                maxBarSize={36}
                isAnimationActive={false}
              >
                {rows.map((row) => (
                  <Cell
                    key={`${row.key}-${index}`}
                    fill={colorFor(row.segments[index]?.model, colors)}
                  />
                ))}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      {legend.length > 0 ? (
        <div className="chart-legend">
          <ul>
            {legend.map((item) => (
              <li key={item.model}>
                <span className="legend-swatch" style={{ background: item.color }} />
                <span className="legend-label" title={item.model}>
                  {item.model}
                </span>
              </li>
            ))}
          </ul>
          <p className="muted legend-note">{AUTO_BILLING_NOTE}</p>
        </div>
      ) : null}
    </div>
  );
}

function SpendTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string | number; payload?: ChartRow }>;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const bucket = item?.payload;
  if (!bucket) return null;
  const rank = typeof item.dataKey === "string" && item.dataKey.startsWith("s")
    ? Number(item.dataKey.slice(1))
    : Number.NaN;
  const segment = Number.isInteger(rank) ? bucket.segments[rank] : undefined;

  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">{bucket.label}</div>
      {segment ? (
        <>
          <div className="chart-tooltip-row">
            <span className="chart-tooltip-model">{segment.model}</span>
            <strong>{formatUsd(segment.spend)}</strong>
          </div>
          <p className="muted">{formatPct(segment.spend, bucket.spend)} of bar</p>
        </>
      ) : null}
      <div className="chart-tooltip-row">
        <span>Total</span>
        <strong>{formatUsd(bucket.spend)}</strong>
      </div>
    </div>
  );
}

function colorMap(buckets: SpendBucket[]): Map<string, string> {
  const totals = new Map<string, number>();
  for (const bucket of buckets) {
    for (const segment of bucket.segments) {
      totals.set(segment.model, (totals.get(segment.model) ?? 0) + segment.spend);
    }
  }
  const ranked = [...totals.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([model]) => model);
  const map = new Map<string, string>();
  let colorIndex = 0;
  for (const model of ranked) {
    if (model === OTHER_MODEL) {
      map.set(model, OTHER_COLOR);
      continue;
    }
    map.set(model, MODEL_COLORS[colorIndex % MODEL_COLORS.length]);
    colorIndex += 1;
  }
  return map;
}

function colorFor(model: string | undefined, colors: Map<string, string>): string {
  if (!model) return OTHER_COLOR;
  return colors.get(model) ?? OTHER_COLOR;
}
