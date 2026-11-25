import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ViewerBoundary } from "./viewer-boundary";

function Broken(): never {
  throw new Error("e is not async iterable");
}

describe("ViewerBoundary", () => {
  it("replaces only the failing viewer with the fallback", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <main>
        <h1>Page</h1>
        <ViewerBoundary fallback={<p>could not be loaded</p>}>
          <Broken />
        </ViewerBoundary>
      </main>,
    );
    expect(screen.getByText("Page")).toBeTruthy();
    expect(screen.getByText("could not be loaded")).toBeTruthy();
    spy.mockRestore();
  });
});
