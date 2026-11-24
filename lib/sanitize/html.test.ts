import { describe, expect, it } from "vitest";
import { sanitizeHtml, sanitizeOptionalHtml } from "./html";

describe("sanitizeHtml", () => {
  it.each([
    ["<script>alert(1)</script><p>ok</p>", "<p>ok</p>"],
    ['<img src="x" onerror="alert(1)">', '<img src="x">'],
    ['<a href="javascript:alert(1)">x</a>', "<a>x</a>"],
    ['<a href="JaVaScRiPt:alert(1)">x</a>', "<a>x</a>"],
    ['<img src="data:image/svg+xml;base64,PHN2Zz4=">', "<img>"],
    ['<iframe src="https://evil.test"></iframe><p>a</p>', "<p>a</p>"],
    ["<style>body{display:none}</style><p>a</p>", "<p>a</p>"],
    ['<p style="position:fixed">a</p>', "<p>a</p>"],
    ["<svg><script>alert(1)</script></svg>", ""],
    // Inputs survive only as disabled checkboxes (GitHub task lists); the form is removed.
    [
      '<form action="https://evil.test"><input name="p"></form>',
      '<input name="user-content-p" disabled type="checkbox">',
    ],
    ['<object data="x"></object><embed src="x">', ""],
    ["<math><mtext><img src=x onerror=alert(1)></mtext></math>", '<img src="x">'],
  ])("neutralises %s", (input, expected) => {
    expect(sanitizeHtml(input)).toBe(expected);
  });

  it("keeps the rich text produced by the editor", () => {
    const html =
      "<h2>Title</h2><p><strong>b</strong> <em>i</em> <u>u</u> <s>s</s> <code>c</code></p>" +
      "<ul><li><p>one</p></li></ul><ol><li>two</li></ol><blockquote><p>q</p></blockquote>" +
      '<pre><code class="language-ts">const a = 1;</code></pre><hr>' +
      '<img src="https://example.supabase.co/storage/v1/object/public/media/a.png" alt="A">';
    expect(sanitizeHtml(html)).toBe(html);
  });

  it("forces safe rel on links that open a new tab", () => {
    expect(sanitizeHtml('<a href="https://x.test" target="_blank" rel="opener">x</a>')).toBe(
      '<a href="https://x.test" target="_blank" rel="noopener noreferrer nofollow">x</a>',
    );
    expect(sanitizeHtml('<a href="https://x.test" target="_top">x</a>')).toBe(
      '<a href="https://x.test">x</a>',
    );
  });

  it("prefixes ids to prevent DOM clobbering", () => {
    expect(sanitizeHtml('<p id="admin">x</p>')).toBe('<p id="user-content-admin">x</p>');
  });

  it("handles empty values", () => {
    expect(sanitizeHtml(null)).toBe("");
    expect(sanitizeOptionalHtml(null)).toBeNull();
    expect(sanitizeOptionalHtml("<p>a</p>")).toBe("<p>a</p>");
  });
});
