// @vitest-environment jsdom
//
// The one date picker every date in Hive is chosen with: a button that reads
// the date the way the app writes it, opening the shared Calendar. The
// approval request's due date joined it (it used to be a native <input
// type="date">, which looked like nothing else in the app), and brought the
// one rule it needs: a floor. Days before `min` cannot be picked.

import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DatePicker } from "./DatePicker";

function dayButton(day: number): HTMLButtonElement {
  const grid = screen.getByRole("grid");
  // Outside days (the tail of the previous month, the head of the next) share
  // a number with this month's days, so pick the one that is not `outside`.
  const cells = within(grid)
    .getAllByRole("button")
    .filter(
      (b) =>
        b.textContent?.trim() === String(day) &&
        b.closest("td")?.getAttribute("data-outside") !== "true",
    );
  expect(cells).toHaveLength(1);
  return cells[0] as HTMLButtonElement;
}

describe("DatePicker", () => {
  it("reads the chosen date the way the rest of the app writes dates", () => {
    render(<DatePicker value="2026-10-12" onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /12 Oct 2026/ })).toBeInTheDocument();
  });

  it("carries an accessible name so a form can label it", () => {
    render(<DatePicker value={null} onChange={vi.fn()} aria-label="Due date" />);
    expect(
      screen.getByRole("button", { name: "Due date: Pick a date" }),
    ).toBeInTheDocument();
  });

  it("keeps the current value in the accessible name when one is chosen", () => {
    render(<DatePicker value="2026-09-25" onChange={vi.fn()} aria-label="Due date" />);
    expect(
      screen.getByRole("button", { name: "Due date: 25 Sep 2026" }),
    ).toBeInTheDocument();
  });

  it("opens on the month of the floor when nothing is chosen yet", () => {
    render(
      <DatePicker
        value={null}
        onChange={vi.fn()}
        min="2026-09-10"
        aria-label="Due date"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Due date:/ }));
    expect(screen.getByRole("grid")).toBeInTheDocument();
    // The caption names the month the grid shows.
    expect(screen.getByText(/September 2026|Sep 2026|Sept 2026/)).toBeInTheDocument();
  });

  it("refuses the days before the floor and accepts the floor itself", () => {
    render(
      <DatePicker
        value={null}
        onChange={vi.fn()}
        min="2026-09-10"
        aria-label="Due date"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Due date:/ }));
    expect(dayButton(9)).toBeDisabled();
    expect(dayButton(1)).toBeDisabled();
    expect(dayButton(10)).not.toBeDisabled();
    expect(dayButton(25)).not.toBeDisabled();
  });

  it("hands back the picked day as yyyy-MM-dd and closes", () => {
    const onChange = vi.fn();
    render(
      <DatePicker
        value={null}
        onChange={onChange}
        min="2026-09-10"
        aria-label="Due date"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Due date:/ }));
    fireEvent.click(dayButton(25));
    expect(onChange).toHaveBeenCalledWith("2026-09-25");
    expect(screen.queryByRole("grid")).toBeNull();
  });

  it("offers Clear once a date is chosen, and hands back null", () => {
    const onChange = vi.fn();
    render(<DatePicker value="2026-09-25" onChange={onChange} aria-label="Due date" />);
    fireEvent.click(screen.getByRole("button", { name: /Due date:/ }));
    fireEvent.click(screen.getByRole("button", { name: /clear/i }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("offers no Clear until a date is chosen", () => {
    render(<DatePicker value={null} onChange={vi.fn()} aria-label="Due date" />);
    fireEvent.click(screen.getByRole("button", { name: /Due date:/ }));
    expect(screen.queryByRole("button", { name: /clear/i })).toBeNull();
  });
});
