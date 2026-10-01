/**
 * Minimal built-in HTML sanitizer.
 * Strips dangerous tags/attributes to prevent XSS when rendering user-provided HTML.
 * Framework-agnostic — usable in any JS runtime.
 *
 * Security: whitelist-based. Only known-safe tags and attributes are preserved.
 * All text content is HTML-escaped. Event handlers and dangerous URL protocols are blocked.
 *
 * Limitation: regex-based, not a full HTML5 parser. For untrusted HTML from
 * end-users, this provides strong defense-in-depth. For maximum security,
 * consider a dedicated library like DOMPurify. This built-in sanitizer is
 * designed to be lightweight (~2KB) with zero dependencies.
 */

/** Tags that are safe for rich text formatting */
const ALLOWED_TAGS = new Set([
  "b",
  "i",
  "u",
  "em",
  "strong",
  "s",
  "del",
  "ins",
  "mark",
  "sub",
  "sup",
  "small",
  "br",
  "span",
  "div",
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "dl",
  "dt",
  "dd",
  "a",
  "img",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "blockquote",
  "pre",
  "code",
  "hr",
  "caption",
  "colgroup",
  "col",
]);

/** Attributes that are safe (no event handlers, no javascript: URLs) */
const ALLOWED_ATTRS = new Set([
  "class",
  "id",
  "style",
  "title",
  "lang",
  "dir",
  "href",
  "target",
  "rel",
  "src",
  "alt",
  "width",
  "height",
  "colspan",
  "rowspan",
  "scope",
  "headers",
  "start",
  "type",
  "reversed",
  "align",
  "valign",
]);

/** Tags that are self-closing (void elements) */
const VOID_TAGS = new Set(["br", "hr", "img", "col"]);

// Regex to check if a URL uses a dangerous protocol
const DANGEROUS_URL_RE = /^(javascript|data|vbscript):/i;

// Regex to extract individual attributes from a tag's attribute string.
// Handles both double-quoted, single-quoted, and unquoted values.
const ATTR_RE = /([a-zA-Z][\w-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/g;

/**
 * Parse an HTML tag string to extract tag name, attributes, and flags.
 * Handles quoted attribute values that may contain `>` characters.
 */
function parseTag(tagStr: string): {
  tagName: string;
  isClosing: boolean;
  isSelfClosing: boolean;
  attrString: string;
} | null {
  const trimmed = tagStr.trim();
  if (!trimmed.startsWith("<") || !trimmed.endsWith(">")) return null;

  const isClosing = trimmed.startsWith("</");
  const inner = trimmed.slice(isClosing ? 2 : 1, -1); // strip <, </, >
  const isSelfClosing = inner.endsWith("/");
  const clean = isSelfClosing ? inner.slice(0, -1) : inner;

  // Tag name must be at the very start of clean (no leading whitespace in HTML tags).
  // Example: "< b" is not a valid tag — it's literal text.
  const nameMatch = /^([a-zA-Z][a-zA-Z0-9]*)/.exec(clean);
  if (!nameMatch) return null;

  const tagName = nameMatch[1].toLowerCase();
  // Everything after the tag name (including whitespace) is the attribute string
  const attrString = clean.slice(nameMatch[1].length).trim();

  return { tagName, isClosing, isSelfClosing, attrString };
}

/**
 * Find the next HTML tag in a string, correctly handling quoted attribute
 * values that may contain `>` characters. Returns the match position or -1.
 */
function findNextTag(
  html: string,
  startPos: number,
): {
  tagStr: string;
  start: number;
  end: number;
} | null {
  const tagStart = html.indexOf("<", startPos);
  if (tagStart === -1) return null;

  // Walk through the string character by character from the tag start,
  // tracking whether we're inside a quoted attribute value.
  let inDoubleQuote = false;
  let inSingleQuote = false;

  for (let i = tagStart + 1; i < html.length; i++) {
    const ch = html[i];

    if (inDoubleQuote) {
      if (ch === '"') inDoubleQuote = false;
      continue;
    }
    if (inSingleQuote) {
      if (ch === "'") inSingleQuote = false;
      continue;
    }

    if (ch === '"') {
      inDoubleQuote = true;
      continue;
    }
    if (ch === "'") {
      inSingleQuote = true;
      continue;
    }
    if (ch === ">") {
      return {
        tagStr: html.slice(tagStart, i + 1),
        start: tagStart,
        end: i + 1,
      };
    }
    // If we hit another `<` before `>`, the tag is malformed — treat the
    // first `<` as literal text and let the caller reprocess from there.
    if (ch === "<") {
      return null; // malformed: `<` inside unquoted attribute
    }
  }

  return null; // no closing `>` found
}

function sanitizeAttributes(attrString: string): string {
  const cleaned: string[] = [];

  for (let match = ATTR_RE.exec(attrString); match !== null; match = ATTR_RE.exec(attrString)) {
    const attrName = match[1].toLowerCase();
    const rawValue = match[2] ?? match[3] ?? match[4] ?? "";

    // Block all event handlers
    if (attrName.startsWith("on")) continue;

    // Only allow known-safe attributes
    if (!ALLOWED_ATTRS.has(attrName)) continue;

    // Block dangerous URL protocols in href/src
    if ((attrName === "href" || attrName === "src") && DANGEROUS_URL_RE.test(rawValue.trim())) {
      continue;
    }

    // Escape HTML entities in attribute values
    const escaped = rawValue.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    cleaned.push(`${attrName}="${escaped}"`);
  }

  return cleaned.length > 0 ? ` ${cleaned.join(" ")}` : "";
}

/**
 * Sanitize a raw HTML string, stripping all dangerous tags and attributes.
 * All text content is HTML-escaped. Only known-safe formatting tags are preserved.
 *
 * @param html - Raw HTML string to sanitize
 * @returns Sanitized HTML string safe for innerHTML insertion
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== "string") return "";

  const output: string[] = [];
  const tagStack: string[] = [];
  let cursor = 0;

  while (cursor < html.length) {
    const tagMatch = findNextTag(html, cursor);

    if (!tagMatch) {
      // No more tags — escape and emit remaining text
      if (cursor < html.length) {
        output.push(escapeHtmlText(html.slice(cursor)));
      }
      break;
    }

    // Emit escaped text before this tag
    if (tagMatch.start > cursor) {
      output.push(escapeHtmlText(html.slice(cursor, tagMatch.start)));
    }

    cursor = tagMatch.end;

    const parsed = parseTag(tagMatch.tagStr);
    if (!parsed) {
      // Couldn't parse — emit the raw text escaped
      output.push(escapeHtmlText(tagMatch.tagStr));
      continue;
    }

    const { tagName, isClosing, isSelfClosing, attrString } = parsed;

    if (isClosing) {
      // Find matching open tag in stack (walk from end)
      const stackIdx = tagStack.lastIndexOf(tagName);
      if (stackIdx !== -1) {
        // Auto-close all tags opened after the matching one
        for (let i = tagStack.length - 1; i > stackIdx; i--) {
          output.push(`</${tagStack[i]}>`);
        }
        output.push(`</${tagName}>`);
        tagStack.length = stackIdx;
      }
      // Orphan closing tag — silently ignore
    } else if (ALLOWED_TAGS.has(tagName)) {
      const safeAttrs = sanitizeAttributes(attrString);

      if (VOID_TAGS.has(tagName) || isSelfClosing) {
        output.push(`<${tagName}${safeAttrs} />`);
      } else {
        output.push(`<${tagName}${safeAttrs}>`);
        tagStack.push(tagName);
      }
    }
    // Disallowed tags are silently stripped (text content preserved)
  }

  // Close any remaining open tags
  for (let i = tagStack.length - 1; i >= 0; i--) {
    output.push(`</${tagStack[i]}>`);
  }

  return output.join("");
}

function escapeHtmlText(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
