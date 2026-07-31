"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ResolvedReportChart } from "@/lib/studio/report-chart-registry";

const CHART_COLORS = [
  "var(--primary)",
  "#7dd3a0",
  "#60a5fa",
  "#fbbf24",
  "#f472b6",
  "#fb923c",
];

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-popover-foreground text-xs shadow-md">
      {label ? (
        <p className="mb-1 font-medium text-muted-foreground">{label}</p>
      ) : null}
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

export function ReportChartView({ chart }: { chart: ResolvedReportChart }) {
  const axisColor = "var(--muted-foreground)";
  const gridColor = "var(--border)";

  const series = chart.series.map((item, index) => ({
    ...item,
    color: item.color ?? CHART_COLORS[index % CHART_COLORS.length],
  }));

  const chartHeight = 280;

  const renderChart = () => {
    if (chart.chartType === "pie") {
      const valueKey = series[0]?.key;
      if (!valueKey) {
        return null;
      }

      return (
        <PieChart>
          <Tooltip content={<ChartTooltip />} />
          <Legend />
          <Pie
            data={chart.data}
            dataKey={valueKey}
            nameKey={chart.xKey}
            cx="50%"
            cy="50%"
            outerRadius={96}
            label
          >
            {chart.data.map((entry, index) => (
              <Cell
                key={`${entry[chart.xKey]}-${index}`}
                fill={CHART_COLORS[index % CHART_COLORS.length]}
              />
            ))}
          </Pie>
        </PieChart>
      );
    }

    const ChartComponent =
      chart.chartType === "line"
        ? LineChart
        : chart.chartType === "area"
          ? AreaChart
          : BarChart;

    const SeriesComponent =
      chart.chartType === "line"
        ? Line
        : chart.chartType === "area"
          ? Area
          : Bar;

    return (
      <ChartComponent data={chart.data}>
        <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
        <XAxis
          dataKey={chart.xKey}
          stroke={axisColor}
          tick={{ fill: axisColor }}
        />
        <YAxis stroke={axisColor} tick={{ fill: axisColor }} />
        <Tooltip content={<ChartTooltip />} />
        <Legend />
        {series.map((item) => (
          <SeriesComponent
            key={item.key}
            type="monotone"
            dataKey={item.key}
            name={item.label}
            stroke={item.color}
            fill={item.color}
            fillOpacity={chart.chartType === "area" ? 0.25 : 1}
          />
        ))}
      </ChartComponent>
    );
  };

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-semibold text-base text-foreground tracking-tight md:text-lg">
          {chart.title}
        </h2>
        {chart.description ? (
          <p className="mt-1 text-sm text-muted-foreground">
            {chart.description}
          </p>
        ) : null}
      </div>

      <div className="rounded-xl border border-border bg-muted/20 p-4">
        <ResponsiveContainer width="100%" height={chartHeight}>
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </section>
  );
}
