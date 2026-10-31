"use client";

import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SalesCharts as SalesChartsData } from "@/lib/admin";
import { formatPeso } from "@/lib/money";

const TICK = { fill: "var(--muted-foreground)", fontSize: 12 };
const TOOLTIP = {
  contentStyle: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    color: "var(--foreground)",
  },
  labelStyle: { color: "var(--foreground)", fontWeight: 600 },
  itemStyle: { color: "var(--foreground)" },
  cursor: { fill: "var(--surface-muted)" },
};

/**
 * One titled chart. The drawing is hidden from screen readers, and its table
 * (one tap away for everyone) gives them the same numbers.
 */
function ChartCard({
  title,
  isEmpty,
  columns,
  rows,
  children,
}: {
  title: string;
  isEmpty: boolean;
  columns: [string, string];
  rows: [string, string][];
  children: ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className="min-w-0 rounded-2xl border bg-surface p-5 shadow-sm"
    >
      <h3 className="font-heading text-lg font-extrabold">{title}</h3>
      {isEmpty ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No sales in this period yet.
        </p>
      ) : (
        <>
          <div aria-hidden="true" className="mt-4 h-64">
            {children}
          </div>
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer font-semibold">
              View as a table
            </summary>
            <table className="mt-2 w-full text-left">
              <thead>
                <tr className="border-b">
                  <th scope="col" className="py-1 font-semibold">
                    {columns[0]}
                  </th>
                  <th scope="col" className="py-1 text-right font-semibold">
                    {columns[1]}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([label, value]) => (
                  <tr key={label} className="border-b last:border-0">
                    <td className="py-1">{label}</td>
                    <td className="py-1 text-right">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </section>
  );
}

/** Horizontal bars, so long item and branch names stay readable on phones. */
function NameBars({
  data,
  dataKey,
  label,
}: {
  data: ({ name: string } & Record<string, string | number>)[];
  dataKey: string;
  label: string;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout="vertical"
        accessibilityLayer={false}
        margin={{ left: 0, right: 12 }}
      >
        <CartesianGrid horizontal={false} stroke="var(--border)" />
        <XAxis
          type="number"
          allowDecimals={false}
          tick={TICK}
          stroke="var(--border)"
        />
        <YAxis
          type="category"
          dataKey="name"
          width={110}
          tick={TICK}
          stroke="var(--border)"
        />
        <Tooltip {...TOOLTIP} />
        <Bar
          dataKey={dataKey}
          name={label}
          fill="var(--primary)"
          radius={[0, 4, 4, 0]}
          maxBarSize={24}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SalesCharts({ data }: { data: SalesChartsData }) {
  const { revenueByDay, ordersByBranch, topItems } = data;
  return (
    <div className="mt-4 grid gap-4 xl:grid-cols-2">
      <div className="min-w-0 xl:col-span-2">
        <ChartCard
          title="Revenue by day"
          isEmpty={revenueByDay.every((day) => day.revenueCentavos === 0)}
          columns={["Day", "Revenue"]}
          rows={revenueByDay.map((day) => [
            day.label,
            formatPeso(day.revenueCentavos),
          ])}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={revenueByDay}
              accessibilityLayer={false}
              margin={{ left: 0, right: 12 }}
            >
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="label"
                tick={TICK}
                stroke="var(--border)"
                minTickGap={16}
              />
              <YAxis
                tick={TICK}
                stroke="var(--border)"
                width={64}
                tickFormatter={(value: number) => formatPeso(value)}
              />
              <Tooltip
                {...TOOLTIP}
                formatter={(value) => formatPeso(Number(value))}
              />
              <Bar
                dataKey="revenueCentavos"
                name="Revenue"
                fill="var(--primary)"
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      <ChartCard
        title="Orders by branch"
        isEmpty={ordersByBranch.every((row) => row.orders === 0)}
        columns={["Branch", "Orders"]}
        rows={ordersByBranch.map((row) => [row.name, String(row.orders)])}
      >
        <NameBars data={ordersByBranch} dataKey="orders" label="Orders" />
      </ChartCard>
      <ChartCard
        title="Top items"
        isEmpty={topItems.length === 0}
        columns={["Item", "Quantity sold"]}
        rows={topItems.map((row) => [row.name, String(row.quantity)])}
      >
        <NameBars data={topItems} dataKey="quantity" label="Quantity sold" />
      </ChartCard>
    </div>
  );
}
