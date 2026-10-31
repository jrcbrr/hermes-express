import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SalesCharts } from "./sales-charts";

const data = {
  revenueByDay: [
    { day: "2026-10-30", label: "Oct 30", revenueCentavos: 0 },
    { day: "2026-10-31", label: "Oct 31", revenueCentavos: 45000 },
  ],
  ordersByBranch: [{ name: "BGC", orders: 3 }],
  topItems: [{ name: "Custom drinks", quantity: 4 }],
};

describe("SalesCharts", () => {
  it("gives every chart a table with the same numbers", () => {
    render(<SalesCharts data={data} />);
    const revenue = screen.getByRole("region", { name: "Revenue by day" });
    expect(within(revenue).getByText("₱450")).toBeInTheDocument();
    const branches = screen.getByRole("region", { name: "Orders by branch" });
    expect(within(branches).getByText("BGC")).toBeInTheDocument();
    const items = screen.getByRole("region", { name: "Top items" });
    expect(within(items).getByText("4")).toBeInTheDocument();
  });

  it("explains an empty period instead of drawing blank charts", () => {
    render(
      <SalesCharts
        data={{
          revenueByDay: [
            { day: "2026-10-31", label: "Oct 31", revenueCentavos: 0 },
          ],
          ordersByBranch: [{ name: "BGC", orders: 0 }],
          topItems: [],
        }}
      />,
    );
    expect(screen.getAllByText("No sales in this period yet.")).toHaveLength(3);
    expect(screen.queryByRole("table")).toBeNull();
  });
});
