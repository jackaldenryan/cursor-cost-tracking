import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatUsd } from "./aggregation";
import type { SpendBucket } from "./types";

type SpendChartProps = {
  buckets: SpendBucket[];
};

export function SpendChart({ buckets }: SpendChartProps) {
  const tickEvery = buckets.length > 20 ? Math.ceil(buckets.length / 12) - 1 : 0;

  return (
    <div className="chart-frame">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={buckets} margin={{ top: 12, right: 12, left: 4, bottom: 8 }}>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="label"
            tick={{ fill: "#8b919c", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval={tickEvery}
            angle={-40}
            textAnchor="end"
            height={56}
          />
          <YAxis
            tickFormatter={(value: number) => formatUsd(value)}
            tick={{ fill: "#8b919c", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={68}
          />
          <Tooltip
            cursor={{ fill: "rgba(61,156,240,0.08)" }}
            contentStyle={{
              background: "#1a1d24",
              border: "1px solid #2a2e38",
              borderRadius: 8,
              color: "#e8eaed",
            }}
            formatter={(value) => [formatUsd(Number(value ?? 0)), "Spend"]}
          />
          <Bar dataKey="spend" fill="#3d9cf0" radius={[4, 4, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
