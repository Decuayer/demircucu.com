import { describe, expect, it } from "vitest";
import { formSnapshot, isGuardedClick } from "./dirty";

describe("formSnapshot", () => {
  it("ignores key order and treats empty values alike", () => {
    expect(formSnapshot({ a: 1, b: "x" })).toBe(formSnapshot({ b: "x", a: 1 }));
    expect(formSnapshot({ a: null })).toBe(formSnapshot({ a: "" }));
    expect(formSnapshot({ a: undefined })).toBe(formSnapshot({ a: "" }));
    expect(formSnapshot({ d: new Date("") })).toBe(formSnapshot({ d: "" }));
    expect(formSnapshot({ d: new Date("2025-01-01") })).toBe(
      formSnapshot({ d: "2025-01-01T00:00:00.000Z" }),
    );
  });

  it("sees changes in nested values and array order", () => {
    expect(formSnapshot({ tags: [{ id: "a" }, { id: "b" }] })).not.toBe(
      formSnapshot({ tags: [{ id: "b" }, { id: "a" }] }),
    );
    expect(formSnapshot({ hobby: { name: "a" } })).not.toBe(formSnapshot({ hobby: { name: "b" } }));
    expect(formSnapshot({ on: true })).not.toBe(formSnapshot({ on: false }));
  });
});

describe("isGuardedClick", () => {
  const click = {
    button: 0,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    defaultPrevented: false,
  };
  const anchor = (href: string, target = "", download = false) => ({
    href,
    target,
    hasAttribute: (name: string) => name === "download" && download,
  });
  const here = "https://site.test/tr/admin/blog/1/edit";

  it("holds plain clicks on links to another page of the site", () => {
    expect(isGuardedClick(click, anchor("https://site.test/tr/admin"), here)).toBe(true);
    expect(isGuardedClick(click, anchor("/tr", "_self"), here)).toBe(true);
    expect(isGuardedClick(click, anchor("https://site.test/tr/admin/blog/1/edit?x=1"), here)).toBe(
      true,
    );
  });

  it("lets new tabs, downloads, other sites, hashes and handled clicks through", () => {
    expect(isGuardedClick({ ...click, metaKey: true }, anchor("/tr/admin"), here)).toBe(false);
    expect(isGuardedClick({ ...click, ctrlKey: true }, anchor("/tr/admin"), here)).toBe(false);
    expect(isGuardedClick({ ...click, shiftKey: true }, anchor("/tr/admin"), here)).toBe(false);
    expect(isGuardedClick({ ...click, altKey: true }, anchor("/tr/admin"), here)).toBe(false);
    expect(isGuardedClick({ ...click, button: 1 }, anchor("/tr/admin"), here)).toBe(false);
    expect(isGuardedClick({ ...click, defaultPrevented: true }, anchor("/tr/admin"), here)).toBe(
      false,
    );
    expect(isGuardedClick(click, anchor("/tr/admin", "_blank"), here)).toBe(false);
    expect(isGuardedClick(click, anchor("/files/a.pdf", "", true), here)).toBe(false);
    expect(isGuardedClick(click, anchor("https://github.com/x"), here)).toBe(false);
    expect(isGuardedClick(click, anchor("mailto:a@b.c"), here)).toBe(false);
    expect(isGuardedClick(click, anchor(`${here}#files`), here)).toBe(false);
    expect(isGuardedClick(click, anchor("http://[bad"), here)).toBe(false);
  });
});
