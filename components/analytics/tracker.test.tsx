import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let pathname = "/tr/blog/hello";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

import { Analytics } from "./tracker";

type Sent = { type: string; [key: string]: unknown };

let beacons: Sent[];
let fetches: Sent[];

beforeEach(() => {
  pathname = "/tr/blog/hello";
  beacons = [];
  fetches = [];
  Object.defineProperty(navigator, "sendBeacon", {
    configurable: true,
    value: (_url: string, body: Blob) => {
      void body.text().then((text) => beacons.push(JSON.parse(text) as Sent));
      return true;
    },
  });
  vi.stubGlobal(
    "fetch",
    vi.fn((_url: string, init: RequestInit) => {
      fetches.push(JSON.parse(String(init.body)) as Sent);
      return Promise.resolve(new Response(null, { status: 204 }));
    }),
  );
  Object.defineProperty(navigator, "doNotTrack", { configurable: true, value: null });
  Object.defineProperty(navigator, "globalPrivacyControl", {
    configurable: true,
    value: undefined,
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

const flushBlobs = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

describe("<Analytics />", () => {
  it("sends one view with the referrer and utm parameters", () => {
    window.history.replaceState(null, "", "/tr/blog/hello?utm_source=newsletter");
    Object.defineProperty(document, "referrer", {
      configurable: true,
      value: "https://google.com/",
    });
    render(<Analytics />);
    expect(fetches).toHaveLength(1);
    expect(fetches[0]).toMatchObject({
      type: "view",
      path: "/tr/blog/hello",
      referrer: "https://google.com/",
      utmSource: "newsletter",
    });
    expect(String(fetches[0]!.id)).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("sends engagement for the previous page and a view for the next one on navigation", async () => {
    const now = vi.spyOn(performance, "now").mockReturnValue(1_000);
    const { rerender } = render(<Analytics />);
    const firstId = fetches[0]!.id;
    now.mockReturnValue(6_000);
    pathname = "/tr/projects/tatum";
    rerender(<Analytics />);
    await flushBlobs();
    expect(beacons).toEqual([
      expect.objectContaining({ type: "engagement", id: firstId, durationMs: 5_000 }),
    ]);
    expect(fetches[1]).toMatchObject({ type: "view", path: "/tr/projects/tatum" });
    expect(fetches[1]!.referrer).toBeUndefined();
  });

  it("does not track admin, auth or profile pages", () => {
    pathname = "/tr/admin/analytics";
    render(<Analytics />);
    expect(fetches).toHaveLength(0);
  });

  it.each([
    ["doNotTrack", "1"],
    ["globalPrivacyControl", true],
  ])("sends nothing with %s", async (key, value) => {
    Object.defineProperty(navigator, key, { configurable: true, value });
    render(<Analytics />);
    document.body.innerHTML = '<a href="https://github.com/x" id="l">x</a>';
    document.getElementById("l")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flushBlobs();
    expect(fetches).toHaveLength(0);
    expect(beacons).toHaveLength(0);
  });

  it("reports external and marked links, not internal ones", async () => {
    render(<Analytics />);
    const viewId = fetches[0]!.id;
    document.body.innerHTML = `
      <a href="https://github.com/Decuayer/x" id="ext"><span id="inner">GitHub</span></a>
      <a href="/tr/projects/x/docs/1" data-track="document" id="doc">Doc</a>
      <a href="/tr/about" id="int">About</a>
      <a href="mailto:a@b.c" id="mail">Mail</a>`;
    const click = (id: string) =>
      document.getElementById(id)!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    for (const id of ["inner", "doc", "int", "mail"]) click(id);
    await flushBlobs();
    expect(beacons).toEqual([
      expect.objectContaining({
        type: "outbound",
        id: viewId,
        path: "/tr/blog/hello",
        href: "https://github.com/Decuayer/x",
      }),
      expect.objectContaining({ type: "outbound", target: "DOCUMENT" }),
    ]);
  });
});
