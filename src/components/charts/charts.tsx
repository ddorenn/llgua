"use client";

/**
 * Chart primitives on Recharts, styled for LINGUA.
 * Rules: thin marks, recessive grid/axes, one y-axis, hover tooltip on every chart,
 * a legend whenever there are 2+ series, text in text tokens (never series colors).
 */
import * as React from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
  type TooltipContentProps,
} from "recharts";

/** Chart colours come from theme tokens, so charts follow light/dark automatically. */
export const CHART = {
  accent: "var(--c-accent)",
  accentSoft: "var(--c-accent-soft)",
  baseline: "var(--c-chart-baseline)",
  grid: "var(--c-line)",
  axis: "var(--c-subtle)",
  surface: "var(--c-card)",
  label: "var(--c-muted)",
};

const axisProps = {
  stroke: CHART.axis,
  tick: { fill: CHART.axis, fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const;

type Row = Record<string, string | number>;

function ChartTooltip({ active, payload, label, unit }: Partial<TooltipContentProps<number, string>> & { unit?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-line bg-card px-3 py-2 text-[12.5px] shadow-pop">
      {label !== undefined && <div className="mb-1 text-muted">{String(label)}</div>}
      {payload.map((p) => (
        <div key={String(p.dataKey)} className="flex items-center gap-2">
          <span className="size-2 rounded-[2px]" style={{ background: p.color }} />
          <span className="text-muted">{p.name}</span>
          <span className="tabular ml-auto pl-3 font-medium text-fg">
            {p.value}
            {unit}
          </span>
        </div>
      ))}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-4 text-[12px] text-muted">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px]" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

export function ColumnChart({ data, x, y, name, unit, height = 220 }: { data: Row[]; x: string; y: string; name: string; unit?: string; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: -18, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid vertical={false} stroke={CHART.grid} />
        <XAxis dataKey={x} {...axisProps} />
        <YAxis {...axisProps} allowDecimals={false} width={44} />
        <Tooltip cursor={{ fill: "var(--c-accent-muted)", opacity: 0.5 }} content={<ChartTooltip unit={unit} />} />
        <Bar dataKey={y} name={name} fill={CHART.accent} radius={[4, 4, 0, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Horizontal paired bars: baseline (gray) vs current (accent). */
export function CompareBars({
  data,
  category,
  a,
  b,
  aName,
  bName,
  unit = "%",
}: {
  data: Row[];
  category: string;
  a: string;
  b: string;
  aName: string;
  bName: string;
  unit?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 46)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }} barGap={2} barCategoryGap="26%">
        <CartesianGrid horizontal={false} stroke={CHART.grid} />
        <XAxis type="number" domain={[0, 100]} {...axisProps} />
        <YAxis type="category" dataKey={category} {...axisProps} tick={{ fill: CHART.label, fontSize: 12 }} width={84} />
        <Tooltip cursor={{ fill: "var(--c-accent-muted)", opacity: 0.5 }} content={<ChartTooltip unit={unit} />} />
        <Bar dataKey={a} name={aName} fill={CHART.baseline} radius={[0, 4, 4, 0]} maxBarSize={10} />
        <Bar dataKey={b} name={bName} fill={CHART.accent} radius={[0, 4, 4, 0]} maxBarSize={10} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TrendLine({ data, x, y, name, unit, domain, height = 220 }: { data: Row[]; x: string; y: string; name: string; unit?: string; domain?: [number, number]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={CHART.grid} />
        <XAxis dataKey={x} {...axisProps} />
        <YAxis {...axisProps} domain={domain} width={44} />
        <Tooltip cursor={{ stroke: CHART.axis, strokeDasharray: "3 3" }} content={<ChartTooltip unit={unit} />} />
        <Line
          type="monotone"
          dataKey={y}
          name={name}
          stroke={CHART.accentSoft}
          strokeWidth={2}
          dot={{ r: 4, fill: CHART.surface, stroke: CHART.accentSoft, strokeWidth: 2 }}
          activeDot={{ r: 5, fill: CHART.accentSoft, stroke: CHART.surface, strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function GrowthArea({ data, x, y, name, height = 220 }: { data: Row[]; x: string; y: string; name: string; height?: number }) {
  const id = React.useId().replace(/:/g, "");
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id={`g-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART.accent} stopOpacity={0.35} />
            <stop offset="100%" stopColor={CHART.accent} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={CHART.grid} />
        <XAxis dataKey={x} {...axisProps} />
        <YAxis {...axisProps} allowDecimals={false} width={44} />
        <Tooltip cursor={{ stroke: CHART.axis, strokeDasharray: "3 3" }} content={<ChartTooltip />} />
        <Area type="monotone" dataKey={y} name={name} stroke={CHART.accentSoft} strokeWidth={2} fill={`url(#g-${id})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Ranked horizontal bars rendered in HTML (crisper labels than SVG for long category names). */
export function RankedBars({ data, unit = "" }: { data: { label: string; value: number }[]; unit?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="space-y-3">
      {data.map((d) => (
        <li key={d.label} title={`${d.label}: ${d.value}${unit}`}>
          <div className="mb-1.5 flex justify-between gap-3 text-[13px]">
            <span className="truncate text-fg/90">{d.label}</span>
            <span className="tabular shrink-0 text-muted">
              {d.value}
              {unit}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-elevated">
            <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
