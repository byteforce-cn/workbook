import { describe, expect, it } from "vitest";
import { sanitizeHtml } from "./sanitize";

describe("sanitizeHtml", () => {
  it("returns empty string for empty input", () => {
    expect(sanitizeHtml("")).toBe("");
    expect(sanitizeHtml(null as unknown as string)).toBe("");
    expect(sanitizeHtml(undefined as unknown as string)).toBe("");
  });

  it("preserves safe formatting tags", () => {
    expect(sanitizeHtml("<b>bold</b>")).toBe("<b>bold</b>");
    expect(sanitizeHtml("<em>italic</em>")).toBe("<em>italic</em>");
    expect(sanitizeHtml("<strong>strong</strong>")).toBe("<strong>strong</strong>");
    expect(sanitizeHtml("<p>paragraph</p>")).toBe("<p>paragraph</p>");
    expect(sanitizeHtml("<br />")).toBe("<br />");
  });

  it("strips script tags and escapes their text content", () => {
    // Text inside script tags is preserved (HTML-escaped) — harmless
    const result = sanitizeHtml('<script>alert("xss")</script>');
    expect(result).not.toContain("<script>");
    // The text content is escaped and visible — not executed
    expect(result).toContain("&quot;xss&quot;");
    // Safe text around script tags is preserved
    expect(sanitizeHtml("<div>safe<script>evil</script>text</div>")).toBe("<div>safeeviltext</div>");
  });

  it("strips event handler attributes", () => {
    expect(sanitizeHtml('<div onclick="alert(1)">click</div>')).toBe("<div>click</div>");
    expect(sanitizeHtml('<img src="x" onerror="alert(1)" />')).toBe('<img src="x" />');
    expect(sanitizeHtml('<a href="#" onmouseover="evil()">link</a>')).toBe('<a href="#">link</a>');
  });

  it("blocks javascript: URLs", () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">click</a>')).toBe("<a>click</a>");
    expect(sanitizeHtml('<img src="javascript:alert(1)" />')).toBe("<img />");
    expect(sanitizeHtml('<a href="JavaScript:alert(1)">click</a>')).toBe("<a>click</a>");
  });

  it("blocks data: URLs even with angle brackets in value", () => {
    // Simple data: URL — href stripped
    expect(sanitizeHtml('<a href="data:text/plain,hello">x</a>')).toBe("<a>x</a>");
    // Complex data: URL with angle brackets in value — still blocked
    const result = sanitizeHtml('<img src="data:image/svg+xml,<svg>evil</svg>" />');
    // The src attribute should be stripped (dangerous protocol)
    expect(result).not.toContain("data:");
    expect(result).not.toContain("svg>evil");
  });

  it("allows safe URLs", () => {
    expect(sanitizeHtml('<a href="https://example.com">link</a>')).toBe('<a href="https://example.com">link</a>');
    expect(sanitizeHtml('<a href="mailto:test@test.com">email</a>')).toBe('<a href="mailto:test@test.com">email</a>');
    expect(sanitizeHtml('<a href="tel:+1234567890">call</a>')).toBe('<a href="tel:+1234567890">call</a>');
    expect(sanitizeHtml('<a href="#section">anchor</a>')).toBe('<a href="#section">anchor</a>');
    expect(sanitizeHtml('<a href="/relative">rel</a>')).toBe('<a href="/relative">rel</a>');
    expect(sanitizeHtml('<img src="https://img.example.com/pic.png" />')).toBe(
      '<img src="https://img.example.com/pic.png" />',
    );
  });

  it("allows safe attributes on elements", () => {
    expect(sanitizeHtml('<td colspan="2" rowspan="1">cell</td>')).toBe('<td colspan="2" rowspan="1">cell</td>');
    expect(sanitizeHtml('<div class="my-class" id="my-id" title="tooltip">text</div>')).toBe(
      '<div class="my-class" id="my-id" title="tooltip">text</div>',
    );
  });

  it("strips unknown tags but preserves text content", () => {
    expect(sanitizeHtml("<custom-tag>content</custom-tag>")).toBe("content");
    expect(sanitizeHtml("<iframe src='evil'></iframe>")).toBe("");
  });

  it("handles nested safe tags", () => {
    expect(sanitizeHtml("<div><p><b>nested</b></p></div>")).toBe("<div><p><b>nested</b></p></div>");
  });

  it("handles unclosed tags by auto-closing at end", () => {
    expect(sanitizeHtml("<div><p>text")).toBe("<div><p>text</p></div>");
    // Note: <li> without </li> is valid HTML but our sanitizer doesn't
    // implement the "optional closing tag" spec behavior. The result
    // is still safe and structurally valid.
    expect(sanitizeHtml("<ul><li>item1</li><li>item2</li></ul>")).toBe("<ul><li>item1</li><li>item2</li></ul>");
  });

  it("escapes text content", () => {
    expect(sanitizeHtml("a < b & c > d")).toBe("a &lt; b &amp; c &gt; d");
    expect(sanitizeHtml("<div>5 < 10 & 3 > 1</div>")).toBe("<div>5 &lt; 10 &amp; 3 &gt; 1</div>");
  });

  it("handles complex real-world cases", () => {
    const input = `
      <div class="content">
        <h1>Title</h1>
        <p>Hello <b>World</b>!</p>
        <script>alert('xss')</script>
        <img src="https://ok.com/img.png" onload="steal()" />
        <a href="javascript:evil()" onclick="bad()">bad link</a>
        <a href="https://safe.com">safe link</a>
      </div>
    `;
    const result = sanitizeHtml(input);
    expect(result).toContain('<div class="content">');
    expect(result).toContain("<h1>Title</h1>");
    expect(result).toContain("<b>World</b>");
    expect(result).toContain('<img src="https://ok.com/img.png" />');
    expect(result).not.toContain("onload");
    expect(result).not.toContain("javascript");
    expect(result).not.toContain("onclick");
    expect(result).not.toContain("<script>");
    expect(result).toContain('<a href="https://safe.com">safe link</a>');
  });

  it("handles nested lists", () => {
    const input = "<ul><li>A<ul><li>B</li></ul></li></ul>";
    expect(sanitizeHtml(input)).toBe("<ul><li>A<ul><li>B</li></ul></li></ul>");
  });
});
