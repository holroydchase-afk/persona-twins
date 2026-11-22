// PTW-M2.3 acceptance tests: the studio design system on the demo page (docs/specs/PTW-design-system.md).
// Each test is named with its acceptance ID (AC-DS-1..14; AC-DS-15 is manual). No network, no browser:
// the page is read through `pagePath` and its <style> block is parsed by the small CSS reader below.
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { root, cliDir, pagePath, readRequired } from "./helpers.ts";

// ---------------------------------------------------------------------------------------------
// Paper theme, copied from hearth docs/design/tokens.json `themes.paper` (Nov 21, 2026). Not fetched.
// ---------------------------------------------------------------------------------------------
type Tokens = Record<string, string>;
const PAPER: { light: Tokens; dark: Tokens } = {
  light: {
    bg: "#F7F7F4", surface: "#FFFFFF", ink: "#1E1B17", muted: "#5C564E", line: "#E3DED4", fill: "#EFECE5",
    accent: "#AD371D", accentInk: "#FFFFFF", accentSoft: "#F2EAE5", safe: "#1C6E31", danger: "#B3261E",
    dangerText: "#B3261E", onDanger: "#FFFFFF", tabLine: "#928E87",
  },
  dark: {
    bg: "#131210", surface: "#1C1A17", ink: "#F1EEE8", muted: "#B2ACA2", line: "#2E2B27", fill: "#24221E",
    accent: "#FF8A65", accentInk: "#000000", accentSoft: "#3D281F", safe: "#7DD394", danger: "#F2B8B5",
    dangerText: "#FF453A", onDanger: "#601410", tabLine: "#696661",
  },
};
const TOKEN_KEYS = Object.keys(PAPER.light);
const cssVar = (key: string) => "--" + key.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
const COLOR_VARS = new Set(TOKEN_KEYS.map(cssVar));
const HC_VARS = ["--muted", "--line", "--accent"];

// ---------------------------------------------------------------------------------------------
// WCAG 2 relative luminance and contrast ratio.
// ---------------------------------------------------------------------------------------------
function hexToRgb(hex: string): [number, number, number] {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  assert.match(h, /^[0-9a-f]{6}$/i, `not a 3- or 6-digit hex color: ${hex}`);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}
function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// ---------------------------------------------------------------------------------------------
// A small CSS reader: comments stripped, nested @media kept as context, declarations split at top level.
// ---------------------------------------------------------------------------------------------
type Rule = { selectors: string[]; decls: Array<[string, string]>; media: string[]; keyframes: boolean; order: number };

function splitTop(s: string, sep: string): string[] {
  const out: string[] = [];
  let depth = 0, quote = "", cur = "";
  for (const ch of s) {
    if (quote) { if (ch === quote) quote = ""; cur += ch; continue; }
    if (ch === '"' || ch === "'") { quote = ch; cur += ch; continue; }
    if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth--;
    if (ch === sep && depth === 0) { out.push(cur); cur = ""; continue; }
    cur += ch;
  }
  out.push(cur);
  return out.map((x) => x.trim()).filter(Boolean);
}

function parseCss(css: string): Rule[] {
  const rules: Rule[] = [];
  const text = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const walk = (src: string, media: string[], keyframes: boolean) => {
    let i = 0;
    while (i < src.length) {
      const open = src.indexOf("{", i);
      if (open < 0) break;
      let prelude = src.slice(i, open);
      prelude = prelude.slice(prelude.lastIndexOf(";") + 1).trim(); // drop @charset/@import statements
      let depth = 0, j = open;
      for (; j < src.length; j++) {
        if (src[j] === "{") depth++;
        else if (src[j] === "}" && --depth === 0) break;
      }
      const body = src.slice(open + 1, j);
      if (/^@media\b/i.test(prelude)) walk(body, [...media, prelude.replace(/^@media\s*/i, "")], keyframes);
      else if (/^@(-webkit-)?keyframes\b/i.test(prelude)) walk(body, media, true);
      else if (/^@supports\b/i.test(prelude)) walk(body, media, keyframes);
      else if (/^@/.test(prelude)) rules.push({ selectors: [prelude], decls: parseDecls(body), media, keyframes, order: rules.length });
      else rules.push({ selectors: splitTop(prelude, ","), decls: parseDecls(body), media, keyframes, order: rules.length });
      i = j + 1;
    }
  };
  walk(text, [], false);
  return rules;
}

function parseDecls(body: string): Array<[string, string]> {
  return splitTop(body, ";")
    .map((d) => {
      const c = d.indexOf(":");
      if (c < 0) return null;
      const prop = d.slice(0, c).trim();
      const value = d.slice(c + 1).replace(/!\s*important\s*$/i, "").trim();
      return [prop.startsWith("--") ? prop : prop.toLowerCase(), value] as [string, string];
    })
    .filter((x): x is [string, string] => x !== null);
}

function pageHtml(): string {
  return readRequired(pagePath);
}
function pageCss(html = pageHtml()): string {
  const blocks = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
  assert.ok(blocks.length > 0, "page has no <style> block");
  return blocks.join("\n");
}
function pageRules(): Rule[] {
  return parseCss(pageCss());
}
function pageScript(html = pageHtml()): string {
  return [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]).join("\n");
}
const normSel = (s: string) =>
  s.replace(/\s+/g, " ").replace(/\s*([>+~])\s*/g, "$1").replace(/'/g, '"')
    .replace(/\[([\w-]+)=([^\]"]+)\]/g, '[$1="$2"]').trim();
const where = (r: Rule) => `${r.media.length ? "@media " + r.media.join(" / ") + " " : ""}${r.selectors.join(", ")}`;

// ---------------------------------------------------------------------------------------------
// :root cascade emulation for custom properties, per environment (scheme, contrast, data-theme).
// ---------------------------------------------------------------------------------------------
type Env = { scheme: "light" | "dark"; contrast: "more" | "no-preference"; theme: null | "light" | "dark" };

function mediaMatches(query: string, env: Env): boolean {
  return splitTop(query, ",").some((q) => {
    let negate = false;
    let s = q.trim().toLowerCase();
    if (s.startsWith("not ")) { negate = true; s = s.slice(4); }
    s = s.replace(/^only\s+/, "");
    const ok = s.split(/\s+and\s+/).every((part) => {
      const p = part.trim();
      if (p === "all" || p === "screen") return true;
      const m = p.match(/^\(\s*([\w-]+)\s*(?::\s*([^)]+?))?\s*\)$/);
      if (!m) return false;
      const [, feat, val] = m;
      if (feat === "prefers-color-scheme") return val === env.scheme;
      if (feat === "prefers-contrast") return val === undefined ? env.contrast !== "no-preference" : val === env.contrast;
      return false; // width, pointer etc. never decide theme tokens
    });
    return negate ? !ok : ok;
  });
}

// Returns the specificity (classes*100 + types) if `sel` targets the root element and matches env, else null.
// Returns undefined if `sel` is not a root selector at all.
function rootMatch(sel: string, env: Env): number | null | undefined {
  let s = normSel(sel).replace(/\s+/g, "");
  if (!s) return undefined;
  let spec = 0, ok = true, sawRoot = false;
  while (s.length) {
    let m: RegExpMatchArray | null;
    if ((m = s.match(/^:root/))) { spec += 100; sawRoot = true; }
    else if ((m = s.match(/^html/))) { spec += 1; sawRoot = true; }
    else if ((m = s.match(/^\[data-theme(?:="([^"]*)")?\]/))) { spec += 100; ok &&= m[1] === undefined ? env.theme !== null : env.theme === m[1]; }
    else if ((m = s.match(/^:not\(\[data-theme(?:="([^"]*)")?\]\)/))) { spec += 100; ok &&= m[1] === undefined ? env.theme === null : env.theme !== m[1]; }
    else return undefined;
    s = s.slice(m[0].length);
  }
  if (!sawRoot) return undefined;
  return ok ? spec : null;
}
const isRootSelector = (sel: string) => rootMatch(sel, { scheme: "light", contrast: "no-preference", theme: null }) !== undefined;
const isTokenBlock = (r: Rule) => !r.keyframes && r.selectors.length > 0 && r.selectors.every(isRootSelector);

function rootWinners(rules: Rule[], env: Env): Map<string, { value: string; spec: number; order: number; rule: Rule }> {
  const best = new Map<string, { value: string; spec: number; order: number; rule: Rule }>();
  for (const r of rules) {
    if (r.keyframes || !r.media.every((q) => mediaMatches(q, env))) continue;
    for (const sel of r.selectors) {
      const spec = rootMatch(sel, env);
      if (spec === null || spec === undefined) continue;
      for (const [prop, value] of r.decls) {
        if (!prop.startsWith("--")) continue;
        const cur = best.get(prop);
        if (!cur || spec > cur.spec || (spec === cur.spec && r.order >= cur.order)) best.set(prop, { value, spec, order: r.order, rule: r });
      }
    }
  }
  return best;
}
function rootVars(rules: Rule[], env: Env): Map<string, string> {
  return new Map([...rootWinners(rules, env)].map(([k, v]) => [k, v.value]));
}

function resolve(value: string, vars: Map<string, string>, depth = 0): string {
  assert.ok(depth < 10, `var() loop resolving ${value}`);
  return value.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^)]*))?\)/g, (_, name: string, fb?: string) => {
    const v = vars.get(name) ?? fb;
    assert.ok(v !== undefined, `var(${name}) is not defined`);
    return resolve(v, vars, depth + 1);
  });
}

function themeColors(vars: Map<string, string>, label: string): Tokens {
  const out: Tokens = {};
  for (const key of TOKEN_KEYS) {
    const name = cssVar(key);
    assert.ok(vars.has(name), `${label}: ${name} is not defined`);
    out[key] = resolve(vars.get(name)!, vars).trim();
  }
  return out;
}

const ENV = {
  light: { scheme: "light", contrast: "no-preference", theme: null } as Env,
  dark: { scheme: "dark", contrast: "no-preference", theme: null } as Env,
  forcedDark: { scheme: "light", contrast: "no-preference", theme: "dark" } as Env,
  forcedLight: { scheme: "dark", contrast: "no-preference", theme: "light" } as Env,
  hcLight: { scheme: "light", contrast: "more", theme: null } as Env,
  hcDark: { scheme: "dark", contrast: "more", theme: null } as Env,
  hcForcedDark: { scheme: "light", contrast: "more", theme: "dark" } as Env,
  hcForcedLight: { scheme: "dark", contrast: "more", theme: "light" } as Env,
};

// ---------------------------------------------------------------------------------------------
// Length tokens: evaluate `17px`, `1.0625rem`, `calc(17rem / 16)` etc. to CSS px (1rem = 16px).
// ---------------------------------------------------------------------------------------------
function toPx(value: string, vars?: Map<string, string>): { px: number; usesRem: boolean } | null {
  let v = vars ? resolve(value, vars) : value;
  if (/var\(/.test(v)) return null;
  const usesRem = /\drem\b/.test(v);
  v = v.replace(/calc\(/g, "(").replace(/(\d*\.?\d+)rem\b/g, "($1*16)").replace(/(\d*\.?\d+)px\b/g, "$1");
  if (!/^[\d.\s+\-*/()]+$/.test(v)) return null;
  try {
    const px = Function(`"use strict"; return (${v});`)() as number;
    return Number.isFinite(px) ? { px: Math.round(px * 1000) / 1000, usesRem } : null;
  } catch { return null; }
}

function lightRoot(): Map<string, string> {
  return rootVars(pageRules(), ENV.light);
}
function tokensWhere(vars: Map<string, string>, pred: (name: string, px: number) => boolean): Set<string> {
  const out = new Set<string>();
  for (const [name, value] of vars) {
    const n = toPx(value, vars);
    if (n && pred(name, n.px)) out.add(name);
  }
  return out;
}

// Selector helpers for component rules.
function lastCompound(sel: string): string {
  const parts = normSel(sel).split(/[ >+~]/);
  return parts[parts.length - 1];
}
// Does a selector item target `target` (e.g. ".rm", "summary", ".voice-row label") in its resting state?
function targets(sel: string, target: string): boolean {
  const s = normSel(sel), t = normSel(target);
  if (/:(hover|focus|active|disabled|focus-visible|focus-within)|::/.test(lastCompound(s))) return false;
  if (s === t || s.endsWith(" " + t) || s.endsWith(">" + t)) return true;
  if (/[ >+~]/.test(t)) return false;
  const lc = lastCompound(s);
  const esc = t.replace(/[.#[\]()]/g, (c) => "\\" + c);
  const re = /^[a-z]/i.test(t) ? new RegExp(`^${esc}(?![\\w-])`, "i") : new RegExp(`${esc}(?![\\w-])`);
  return re.test(lc);
}
function rulesFor(rules: Rule[], target: string): Rule[] {
  return rules.filter((r) => !r.keyframes && r.selectors.some((s) => targets(s, target)));
}

const NAMED_COLORS = (
  "aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood " +
  "cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray " +
  "darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen " +
  "darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue " +
  "firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew " +
  "hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan " +
  "lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray " +
  "lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue " +
  "mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred " +
  "midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid " +
  "palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple " +
  "rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue " +
  "slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white " +
  "whitesmoke yellow yellowgreen"
).split(" ");
const NAMED_RE = new RegExp(`(?<![\\w-])(${NAMED_COLORS.join("|")})(?![\\w-])`, "i");
const ATKINSON_STACK = `"Atkinson Hyperlegible Next", system-ui, sans-serif`;
const normStack = (s: string) => s.replace(/'/g, '"').replace(/\s*,\s*/g, ", ").replace(/\s+/g, " ").trim();

// ============================================================================================
// Tests
// ============================================================================================

test("AC-DS-1 one stylesheet link: Atkinson Hyperlegible Next 400;500;600 only; no other font-family", () => {
  const html = pageHtml();
  const links = [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]).filter((l) => /rel\s*=\s*["']?stylesheet/i.test(l));
  assert.equal(links.length, 1, `expected exactly one stylesheet <link>, found ${links.length}`);
  const href = links[0].match(/href\s*=\s*["']([^"']+)["']/i)?.[1] ?? "";
  const url = new URL(href.replace(/&amp;/g, "&"));
  assert.equal(url.hostname, "fonts.googleapis.com", `stylesheet host: ${url.hostname}`);
  const families = url.searchParams.getAll("family");
  assert.equal(families.length, 1, `expected one font family, got: ${families.join(" | ")}`);
  const [name, axes = ""] = families[0].split(":");
  assert.equal(name.replace(/\+/g, " "), "Atkinson Hyperlegible Next", `font family: ${name}`);
  assert.doesNotMatch(axes, /ital/i, `font axes include ital: ${axes}`);
  assert.match(axes, /^wght@/, `font axes should be wght@400;500;600, got: ${axes}`);
  assert.deepEqual(axes.replace(/^wght@/, "").split(";").map(Number), [400, 500, 600], `weights: ${axes}`);

  for (const banned of [/Bricolage/i, /JetBrains/i, /family=Inter\b/i, /["']Inter["']/, /(?<![\w-])Inter\s*,/]) {
    assert.doesNotMatch(html, banned, `page still references a retired font (${banned})`);
  }
  const rules = pageRules();
  const vars = lightRoot();
  for (const r of rules) {
    for (const [prop, value] of r.decls) {
      if (prop === "font-family" || (prop.startsWith("--") && /sans-serif|monospace|serif\b|system-ui/.test(value))) {
        if (value === "inherit") continue;
        assert.equal(normStack(resolve(value, vars)), ATKINSON_STACK, `${where(r)} { ${prop}: ${value} }`);
      }
      if (prop === "font" && value !== "inherit") {
        assert.fail(`${where(r)} uses the font shorthand (${value}); set font-family/size/weight from tokens instead`);
      }
    }
  }
  const body = rulesFor(rules, "body").flatMap((r) => r.decls).filter(([p]) => p === "font-family").pop();
  assert.ok(body, "body has no font-family");
  assert.equal(normStack(resolve(body[1], vars)), ATKINSON_STACK, `body font-family: ${body[1]}`);
});

test("AC-DS-2 type tokens 17/22, 22/28, 28/34 in rem; every font-size is a type token", () => {
  const vars = lightRoot();
  const remTokens = new Map<number, string[]>();
  for (const [name, value] of vars) {
    const n = toPx(value, vars);
    if (n?.usesRem) remTokens.set(n.px, [...(remTokens.get(n.px) ?? []), name]);
  }
  for (const px of [17, 22, 28, 34]) {
    assert.ok(remTokens.has(px), `:root has no rem type token equal to ${px}px (e.g. calc(${px}rem / 16)); rem tokens: ${[...remTokens].map(([k, v]) => `${v.join("/")}=${k}`).join(", ") || "none"}`);
  }
  const sizeTokens = new Set([17, 22, 28].flatMap((px) => remTokens.get(px)!));
  const bad: string[] = [];
  for (const r of pageRules()) {
    for (const [prop, value] of r.decls) {
      if (prop !== "font-size") continue;
      if (value === "inherit") continue;
      const m = value.match(/^var\(\s*(--[\w-]+)\s*\)$/);
      if (!m || !sizeTokens.has(m[1])) bad.push(`${where(r)} { font-size: ${value} }`);
    }
  }
  assert.deepEqual(bad, [], "font sizes that are not a 17/22/28 rem type token");
});

test("AC-DS-3 weights 400/500/600 only; strong, summary, h1-h4 at 600; no italic or uppercase", () => {
  const rules = pageRules();
  const vars = lightRoot();
  const bad: string[] = [];
  for (const r of rules) {
    for (const [prop, value] of r.decls) {
      if (prop === "font-weight" && !["400", "500", "600", "inherit"].includes(resolve(value, vars).trim())) bad.push(`${where(r)} { font-weight: ${value} }`);
      if (prop === "font-style" && /italic|oblique/i.test(value)) bad.push(`${where(r)} { font-style: ${value} }`);
      if (prop === "text-transform" && /uppercase/i.test(value)) bad.push(`${where(r)} { text-transform: ${value} }`);
    }
  }
  assert.deepEqual(bad, [], "weights other than 400/500/600, italics or all caps");
  for (const el of ["strong", "summary", "h1", "h2", "h3", "h4"]) {
    const w = rulesFor(rules, el).filter((r) => r.media.length === 0).flatMap((r) => r.decls).filter(([p]) => p === "font-weight").pop();
    assert.ok(w, `${el} does not set font-weight`);
    assert.equal(resolve(w[1], vars).trim(), "600", `${el} font-weight`);
  }
});

test("AC-DS-4 space and radius tokens; every padding, margin, gap, inset and radius uses them", () => {
  const vars = lightRoot();
  const space = tokensWhere(vars, (n, px) => /space/i.test(n) && [4, 8, 12, 16, 24, 32].includes(px));
  const radius = tokensWhere(vars, (n, px) => /radius/i.test(n) && [4, 12, 16, 999].includes(px));
  const spaceVals = new Set([...space].map((n) => toPx(vars.get(n)!, vars)!.px));
  const radiusVals = new Set([...radius].map((n) => toPx(vars.get(n)!, vars)!.px));
  assert.deepEqual([...spaceVals].sort((a, b) => a - b), [4, 8, 12, 16, 24, 32], ":root space tokens (names containing 'space') xs4 sm8 md12 lg16 xl24 xxl32");
  assert.deepEqual([...radiusVals].sort((a, b) => a - b), [4, 12, 16, 999], ":root radius tokens (names containing 'radius') small4 medium12 photo16 pill999");

  const spaceProp = /^(padding|margin|gap|row-gap|column-gap|inset|top|right|bottom|left)(-|$)/;
  const okValue = (value: string, allowed: Set<string>, extra: RegExp) => {
    let v = value.replace(/env\(\s*safe-area-inset-[a-z]+\s*(?:,[^()]*(?:\([^()]*\))?[^()]*)?\)/g, " ");
    for (const m of v.matchAll(/var\(\s*(--[\w-]+)\s*\)/g)) if (!allowed.has(m[1])) return false;
    v = v.replace(/var\(\s*--[\w-]+\s*\)/g, " ").replace(/\b(calc|max|min|clamp)\(/g, " ").replace(/[(),]/g, " ");
    return v.split(/\s+/).filter(Boolean).every((t) => /^0(px|rem)?$/.test(t) || extra.test(t));
  };
  const bad: string[] = [];
  for (const r of pageRules()) {
    if (r.keyframes || isTokenBlock(r)) continue;
    for (const [prop, value] of r.decls) {
      if (spaceProp.test(prop) && !okValue(value, space, /^(auto|inherit)$/)) bad.push(`${where(r)} { ${prop}: ${value} }`);
      if (/^border(-[a-z]+)*-radius$/.test(prop) && !okValue(value, radius, /^inherit$/)) bad.push(`${where(r)} { ${prop}: ${value} }`);
      if (prop === "outline-offset" && !["0", "2px"].includes(value)) bad.push(`${where(r)} { ${prop}: ${value} }`);
      if (/^border(-(top|right|bottom|left|block|inline)(-(start|end))?)?(-width)?$/.test(prop)) {
        for (const lit of value.match(/\d*\.?\d+px/g) ?? []) if (!["1px", "2px"].includes(lit)) bad.push(`${where(r)} { ${prop}: ${value} }`);
      }
    }
  }
  assert.deepEqual(bad, [], "spacing/radius/border values that are not tokens or allowed literals");
});

test("AC-DS-5 light and dark tokens equal Paper; retired color vars gone; no raw colors outside token blocks", () => {
  const rules = pageRules();
  const check = (env: Env, expected: Tokens, label: string) => {
    const got = themeColors(rootVars(rules, env), label);
    for (const key of TOKEN_KEYS) assert.equal(got[key].toUpperCase(), expected[key].toUpperCase(), `${label} ${cssVar(key)}`);
  };
  check(ENV.light, PAPER.light, "light");
  check(ENV.dark, PAPER.dark, "dark (system)");
  check(ENV.forcedDark, PAPER.dark, `dark (:root[data-theme="dark"])`);
  check(ENV.forcedLight, PAPER.light, `light (data-theme="light" on a dark system)`);

  const has = (media: (m: string[]) => boolean, sel: string) =>
    rules.some((r) => media(r.media) && r.selectors.some((s) => normSel(s).replace(/\s/g, "") === sel));
  assert.ok(has((m) => m.length === 1 && /prefers-color-scheme:\s*dark/.test(m[0]) && !/contrast/.test(m[0]), `:root:not([data-theme="light"])`),
    `missing @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ... } }`);
  assert.ok(has((m) => m.length === 0, `:root[data-theme="dark"]`), `missing top-level :root[data-theme="dark"] { ... }`);

  const css = pageCss();
  for (const gone of ["--mark", "--mark-ink", "--you", "--warn", "--panel"]) {
    assert.doesNotMatch(css, new RegExp(`${gone}(?![\\w-])`), `<style> still uses ${gone}`);
  }
  const bad: string[] = [];
  for (const r of rules) {
    const token = isTokenBlock(r);
    for (const [prop, value] of r.decls) {
      const isColor = /#[0-9a-f]{3,8}\b|\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/i.test(value) || NAMED_RE.test(value.replace(/var\([^)]*\)|"[^"]*"/g, " "));
      if (token && prop.startsWith("--")) {
        if (isColor && !COLOR_VARS.has(prop)) bad.push(`${where(r)} { ${prop}: ${value} } is a color var outside the Paper set`);
        continue;
      }
      if (isColor) bad.push(`${where(r)} { ${prop}: ${value} }`);
    }
  }
  assert.deepEqual(bad, [], "raw colors outside the Paper token blocks");
});

test("AC-DS-6 prefers-contrast: more blocks for light and dark override only muted, line, accent", () => {
  const rules = pageRules();
  const isHc = (r: Rule) => r.media.some((m) => /prefers-contrast/.test(m));
  const hcRules = rules.filter((r) => isHc(r) && isTokenBlock(r));
  assert.ok(hcRules.length > 0, "no @media (prefers-contrast: more) block on :root");
  const extra = hcRules.flatMap((r) => r.decls.filter(([p]) => p.startsWith("--") && !HC_VARS.includes(p)).map(([p]) => `${where(r)} { ${p} }`));
  assert.deepEqual(extra, [], "high-contrast blocks may only override --muted, --line and --accent");
  for (const [label, env] of Object.entries({ "HC light": ENV.hcLight, "HC dark": ENV.hcDark, "HC + Theme Dark": ENV.hcForcedDark, "HC + Theme Light on dark system": ENV.hcForcedLight })) {
    // Which vars does a high-contrast rule actually win in the cascade for this environment?
    const won = [...rootWinners(rules, env)].filter(([, w]) => isHc(w.rule)).map(([k]) => k).sort();
    assert.deepEqual(won, [...HC_VARS].sort(), `${label}: vars won by a prefers-contrast: more rule`);
  }
});

test("AC-DS-7 WCAG 2 contrast in light, dark, HC light and HC dark", () => {
  const rules = pageRules();
  const scenarios: Array<[string, Env, boolean]> = [
    ["light", ENV.light, false], ["dark", ENV.dark, false],
    ["HC light", ENV.hcLight, true], ["HC dark", ENV.hcDark, true],
    ["HC + Theme Dark", ENV.hcForcedDark, true], ["HC + Theme Light on dark system", ENV.hcForcedLight, true],
  ];
  const failures: string[] = [];
  for (const [label, env, hc] of scenarios) {
    const t = themeColors(rootVars(rules, env), label);
    const need = (fg: string, bgs: string[], min: number) => {
      for (const bg of bgs) {
        const ratio = contrast(t[fg], t[bg]);
        if (ratio < min) failures.push(`${label}: ${fg} ${t[fg]} on ${bg} ${t[bg]} is ${ratio.toFixed(2)}:1, needs ${min}:1`);
      }
    };
    need("ink", ["bg", "surface"], 7);
    need("muted", ["bg", "surface", "fill"], hc ? 7 : 4.5);
    need("accent", ["bg", "surface", "fill", "accentSoft"], 4.5);
    need("accentInk", ["accent"], hc ? 7 : 4.5);
    if (hc) need("line", ["bg"], 4.5);
    need("tabLine", ["bg", "surface"], 3);
    need("safe", ["bg", "surface"], 4.5);
    need("dangerText", ["bg", "surface"], 4.5);
  }
  assert.deepEqual(failures, [], "contrast pairs below the WCAG 2 minimum");
});

test("AC-DS-8 no shadows; :focus-visible is a 2px solid accent outline that never changes size", () => {
  const rules = pageRules();
  const bad: string[] = [];
  for (const r of rules) for (const [p, v] of r.decls) if ((p === "box-shadow" || p === "text-shadow") && v !== "none") bad.push(`${where(r)} { ${p}: ${v} }`);
  assert.deepEqual(bad, [], "shadows other than none");

  const focus = rules.filter((r) => r.selectors.some((s) => /:focus/.test(s)));
  const fv = focus.filter((r) => r.selectors.some((s) => /:focus-visible/.test(s)));
  assert.ok(fv.length > 0, "no :focus-visible rule");
  const decls = new Map(fv.flatMap((r) => r.decls));
  const outline = (decls.get("outline") ?? [decls.get("outline-width"), decls.get("outline-style"), decls.get("outline-color")].join(" ")).replace(/\s+/g, " ").trim();
  const parts = outline.split(" ").sort();
  assert.deepEqual(parts, ["2px", "solid", "var(--accent)"].sort(), `:focus-visible outline is "${outline}"`);
  const sizey = /^(border(-[a-z]+)*-width|border(-(top|right|bottom|left|block|inline))?|padding(-[a-z]+)*|margin(-[a-z]+)*|(min-|max-)?(width|height)|font-size|line-height|inset)$/;
  const changes = focus.flatMap((r) => r.decls.filter(([p]) => sizey.test(p)).map(([p, v]) => `${where(r)} { ${p}: ${v} }`));
  assert.deepEqual(changes, [], "focus rules must not change border width, padding or size");
});

test("AC-DS-9 controls set min-height (and .rm min-width) to the 48 target token", () => {
  const rules = pageRules().filter((r) => !r.keyframes && r.media.length === 0);
  const vars = lightRoot();
  const target = tokensWhere(vars, (_n, px) => px === 48);
  assert.ok(target.size > 0, ":root has no 48 target token");
  const usesTarget = (v: string | undefined) => !!v && [...v.matchAll(/var\(\s*(--[\w-]+)\s*\)/g)].some((m) => target.has(m[1])) && /^var\([^)]*\)$/.test(v.trim());
  const last = (sel: string, prop: string) => rulesFor(rules, sel).flatMap((r) => r.decls).filter(([p]) => p === prop).pop()?.[1];
  const missing: string[] = [];
  for (const sel of [".btn", "select", ".starter", ".speak", ".rm", "summary", ".drop", ".voice-row label", "#theme"]) {
    let mh = last(sel, "min-height");
    if (sel === "#theme" && !mh) mh = last("select", "min-height");
    if (!usesTarget(mh)) missing.push(`${sel} min-height: ${mh ?? "(not set)"}`);
  }
  if (!usesTarget(last(".rm", "min-width"))) missing.push(`.rm min-width: ${last(".rm", "min-width") ?? "(not set)"}`);
  assert.deepEqual(missing, [], "controls without the 48 target");
});

test("AC-DS-10 avatar, twin replies, refs, tile badges and thinking do not use the accent", () => {
  const bad: string[] = [];
  for (const r of pageRules()) {
    const hit = r.selectors.find((s) => /\.avatar(?![\w-])|\.msg\.twin\s+\.body(?![\w-])|\.ref(?![\w-])|\.shot\s+\.(num|ex)(?![\w-])|\.thinking(?![\w-])/.test(normSel(s)));
    if (!hit) continue;
    for (const [p, v] of r.decls) if (/var\(\s*--accent(-soft)?\s*[,)]/.test(v)) bad.push(`${where(r)} { ${p}: ${v} }`);
  }
  assert.deepEqual(bad, [], "accent used for decoration");
});

// Extracts a top-level function declaration from the page's inline script.
function scriptFunction(src: string, name: string): string {
  const m = src.match(new RegExp(`function\\s+${name}\\s*\\(`));
  assert.ok(m && m.index !== undefined, `page script has no function ${name}()`);
  let depth = 0, i = src.indexOf("{", m.index);
  const open = i;
  for (; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}" && --depth === 0) break;
  }
  return src.slice(open, i + 1);
}

test('AC-DS-11 renderShots() remove button says "Remove" and keeps aria-label "Remove screenshot N"', () => {
  const fn = scriptFunction(pageScript(), "renderShots");
  assert.doesNotMatch(fn, /×|&times;|\\u00d7/i, 'renderShots() still renders "×"');
  assert.match(fn, /class="rm"/, 'renderShots() has no class="rm" button');
  assert.match(fn, /aria-label="Remove screenshot \$\{[^}]+\}"/, 'aria-label="Remove screenshot ${N}" is gone');
  assert.match(fn, /<button\b[^>]*class="rm"[^>]*>\s*Remove\s*<\/button>|\.textContent\s*=\s*["'`]Remove["'`]/, 'the .rm button text is not "Remove"');
});

test("AC-DS-12 .err and .status use var(--danger-text)", () => {
  const rules = pageRules().filter((r) => r.media.length === 0);
  for (const sel of [".err", ".status"]) {
    const color = rulesFor(rules, sel).flatMap((r) => r.decls).filter(([p]) => p === "color").pop()?.[1];
    assert.equal(color?.replace(/\s/g, ""), "var(--danger-text)", `${sel} color`);
  }
});

test('AC-DS-13 header <select id="theme"> labeled Theme with System/Light/Dark, saved in twin-theme', () => {
  const html = pageHtml();
  const header = html.match(/<header\b[^>]*>([\s\S]*?)<\/header>/i)?.[1] ?? "";
  const sel = header.match(/<select\b[^>]*\bid=["']theme["'][^>]*>([\s\S]*?)<\/select>/i);
  assert.ok(sel, '<header> has no <select id="theme">');
  const text = (s: string) => s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  const options = [...sel[1].matchAll(/<option\b[^>]*>([\s\S]*?)<\/option>/gi)].map((m) => text(m[1]));
  assert.deepEqual(options, ["System", "Light", "Dark"], "theme options");
  const forLabel = html.match(/<label\b[^>]*\bfor=["']theme["'][^>]*>([\s\S]*?)<\/label>/i);
  const wrapping = [...html.matchAll(/<label\b[^>]*>([\s\S]*?)<\/label>/gi)].find((m) => /id=["']theme["']/.test(m[1]));
  const labelledby = sel[0].match(/aria-labelledby=["']([^"']+)["']/)?.[1];
  const byId = labelledby ? html.match(new RegExp(`id=["']${labelledby}["'][^>]*>([\\s\\S]*?)<`))?.[1] : undefined;
  const labelText = forLabel ? text(forLabel[1]) : wrapping ? text(wrapping[1].replace(/<select[\s\S]*<\/select>/i, "")) : byId ? text(byId) : undefined;
  assert.equal(labelText, "Theme", "the theme select's label");

  assert.doesNotMatch(html, /<html\b[^>]*data-theme/i, "the page must not ship a data-theme attribute");
  const js = pageScript(html);
  assert.match(js, /localStorage\.getItem\(\s*["']twin-theme["']\s*\)/, 'script never reads localStorage "twin-theme"');
  assert.match(js, /localStorage\.setItem\(\s*["']twin-theme["']/, 'script never saves localStorage "twin-theme"');
  assert.match(js, /setAttribute\(\s*["']data-theme["']|dataset\.theme\s*=(?!=)/, "script never sets data-theme");
  assert.match(js, /removeAttribute\(\s*["']data-theme["']\s*\)|delete\s+[\w.]*dataset\.theme/, "script never removes data-theme (System)");
  // Static guard for "nothing saved = never write data-theme": the value written is never "system" or empty.
  assert.doesNotMatch(js, /setAttribute\(\s*["']data-theme["']\s*,\s*["'](system|)["']|dataset\.theme\s*=\s*["'](system|)["']/i, 'script writes data-theme="system" or ""');
});

test("AC-DS-14 title and h1 unchanged from main; tsc passes", (t) => {
  const html = pageHtml();
  const rel = path.relative(root, pagePath).split(path.sep).join("/");
  let mainHtml: string | undefined, ref = "";
  for (const r of ["main", "origin/main"]) {
    const g = spawnSync("git", ["show", `${r}:${rel}`], { cwd: root, encoding: "utf8" });
    if (g.status === 0) { mainHtml = g.stdout; ref = r; break; }
  }
  const tsc = spawnSync(path.join(cliDir, "node_modules", ".bin", "tsc"), ["--noEmit"], { cwd: cliDir, encoding: "utf8", timeout: 120000 });
  assert.equal(tsc.status, 0, `tsc --noEmit failed:\n${tsc.stdout}${tsc.stderr}`);
  if (!mainHtml) { t.skip(`git history for ${rel} on main/origin/main is unavailable; title/h1 comparison not run`); return; }
  const grab = (s: string, tag: string) => s.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "i"))?.[1];
  for (const tag of ["title", "h1"]) {
    assert.ok(grab(mainHtml, tag) !== undefined, `${ref}:${rel} has no <${tag}>`);
    assert.equal(grab(html, tag), grab(mainHtml, tag), `<${tag}> text differs from ${ref}`);
  }
});

// ============================================================================================
// ux-reviewer findings DS-R2..DS-R7 on the restyle (each named with its ID). AC-DS-9/10/11 still
// apply to .rm, .num and .ex wherever they end up in the new caption row.
// ============================================================================================

const flat = (v: string | undefined) => (v ?? "").replace(/\s+/g, " ").trim();
// Last resting, top-level value of `prop` across rules targeting `sel`.
function lastDecl(rules: Rule[], sel: string, prop: string): string | undefined {
  return rulesFor(rules.filter((r) => r.media.length === 0), sel).flatMap((r) => r.decls).filter(([p]) => p === prop).pop()?.[1];
}
// The page markup without <style> and with <script> bodies kept (they hold button strings).
const markupAndScript = (html = pageHtml()) => html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");

test("AC-DS-R2 .status and .err: 2px solid var(--danger) inline-start rule, var(--danger-text) text; #status sits directly under the textarea", () => {
  const rules = pageRules();
  for (const sel of [".status", ".err"]) {
    const short = lastDecl(rules, sel, "border-inline-start");
    const longs = ["border-inline-start-width", "border-inline-start-style", "border-inline-start-color"].map((p) => lastDecl(rules, sel, p));
    const got = longs.every(Boolean) ? longs.join(" ") : flat(short);
    assert.deepEqual(got.split(" ").filter(Boolean).sort(), ["2px", "solid", "var(--danger)"].sort(),
      `${sel} border-inline-start is "${got || "(not set)"}", expected 2px solid var(--danger)`);
    assert.equal(lastDecl(rules, sel, "color")?.replace(/\s/g, ""), "var(--danger-text)", `${sel} color`);
  }
  const form = pageHtml().match(/<form\b[^>]*\bid=["']form["'][^>]*>([\s\S]*?)<\/form>/i)?.[1];
  assert.ok(form, 'no <form id="form">');
  const st = form.search(/<[a-z]+\b[^>]*\bid=["']status["']/i);
  const row = form.search(/<div\b[^>]*\bclass=["']row["']/i);
  assert.ok(st >= 0, "#status is not inside the form");
  assert.ok(row >= 0, 'no <div class="row"> in the form');
  assert.ok(st < row, "#status comes after the .row div; it should sit directly under the textarea");
  const afterTextarea = form.slice(form.search(/<\/textarea>/i) + "</textarea>".length).match(/<([a-z]+)\b[^>]*>/i)?.[0] ?? "";
  assert.match(afterTextarea, /\bid=["']status["']/, `the element right after the textarea is ${afterTextarea || "(none)"}, not #status`);
});

test("AC-DS-R3 .panel is flat (no background, border, radius or padding); sections separated by var(--line) dividers", () => {
  const rules = pageRules().filter((r) => !r.keyframes);
  const panelRules = rulesFor(rules, ".panel");
  assert.ok(panelRules.length > 0, "no rule targets .panel");
  const divider = /^border-(top|bottom|block-start|block-end)$/;
  const isLineDivider = (p: string, v: string) => divider.test(p) && /var\(\s*--line\s*\)/.test(v);
  const bad: string[] = [];
  for (const r of panelRules) {
    for (const [p, v] of r.decls) {
      const val = flat(v);
      if (/^background(-color|-image)?$/.test(p) && !/^(none|transparent|unset|initial)$/.test(val)) bad.push(`${where(r)} { ${p}: ${v} }`);
      if (/^border(-[a-z]+)*-radius$/.test(p) && !/^(0(px|rem)?|unset|initial)$/.test(val)) bad.push(`${where(r)} { ${p}: ${v} }`);
      if (/^padding(-[a-z]+)*$/.test(p) && !/^(0(px|rem)?\s*)+$|^(unset|initial)$/.test(val)) bad.push(`${where(r)} { ${p}: ${v} }`);
      if (/^border(-(top|right|bottom|left|block|inline)(-(start|end))?)?(-(width|style|color))?$/.test(p)
        && !/^(none|0(px)?|unset|initial|transparent)$/.test(val) && !isLineDivider(p, v)) bad.push(`${where(r)} { ${p}: ${v} }`);
    }
  }
  assert.deepEqual(bad, [], ".panel still draws a card (background, box border, radius or padding)");
  const dividers = rules.filter((r) => r.selectors.some((s) => /\.panel(?![\w-])|section/.test(s))
    && r.decls.some(([p, v]) => isLineDivider(p, v)));
  assert.ok(dividers.length > 0, "no var(--line) divider (border-top/bottom/block-start/end) between .panel sections");
});

// Ancestors (tag + attrs) of each element in an HTML template string, by a simple tag walk.
function ancestorsAt(tpl: string, pick: RegExp): { self: string; stack: string[] } | null {
  const VOID = new Set(["img", "input", "br", "hr", "source", "meta", "link"]);
  const stack: string[] = [];
  for (const m of tpl.matchAll(/<(\/?)([a-z][\w-]*)\b[^>]*>/gi)) {
    if (pick.test(m[0])) return { self: m[0], stack: [...stack] };
    if (m[1]) stack.pop();
    else if (!VOID.has(m[2].toLowerCase()) && !m[0].endsWith("/>")) stack.push(m[0]);
  }
  return null;
}

test("AC-DS-R4 .num/.ex/.rm are not absolutely positioned; Remove sits in a caption row after the image container; .shot img object-position top left", () => {
  const rules = pageRules().filter((r) => !r.keyframes);
  const bad: string[] = [];
  for (const r of rules) {
    if (!r.selectors.some((s) => /\.(num|ex|rm)(?![\w-])/.test(lastCompound(s)))) continue;
    for (const [p, v] of r.decls) if (p === "position" && /absolute|fixed/i.test(v)) bad.push(`${where(r)} { position: ${v} }`);
  }
  assert.deepEqual(bad, [], ".num, .ex or .rm overlays the screenshot");

  const fn = scriptFunction(pageScript(), "renderShots");
  const tpl = [...fn.matchAll(/`([\s\S]*?)`/g)].map((m) => m[1]).find((s) => /class="rm"/.test(s));
  assert.ok(tpl, 'renderShots() has no template with class="rm"');
  const img = ancestorsAt(tpl, /^<img\b/i);
  const rm = ancestorsAt(tpl, /class="rm"/);
  assert.ok(img && rm, "renderShots() template is missing the <img> or the .rm button");
  assert.ok(tpl.search(/class="rm"/) > tpl.search(/<img\b/i), "the Remove button comes before the <img>");
  const container = img.stack[img.stack.length - 1];
  assert.ok(container, "the <img> has no image container inside the template (it is a direct child of .shot, which also holds Remove)");
  assert.ok(!rm.stack.includes(container), `the Remove button is inside the image container ${container}; it belongs in a caption row after it`);

  const pos = rules.filter((r) => r.media.length === 0 && r.selectors.some((s) => lastCompound(s) === "img" && /\.shot(?![\w-])/.test(normSel(s))))
    .flatMap((r) => r.decls).filter(([p]) => p === "object-position").pop()?.[1];
  assert.ok(pos && /^(top left|left top|0(%|px)? 0(%|px)?)$/.test(flat(pos)), `.shot img object-position is ${pos ?? "(not set)"}, expected top left`);
});

test('AC-DS-R5 #status has role="alert"', () => {
  const tag = pageHtml().match(/<[a-z]+\b[^>]*\bid=["']status["'][^>]*>/i)?.[0];
  assert.ok(tag, "no #status element");
  assert.match(tag, /\brole=["']alert["']/, `#status is ${tag}`);
});

test("AC-DS-R6 input[type=checkbox] uses accent-color: var(--accent)", () => {
  const rules = pageRules().filter((r) => !r.keyframes && r.media.length === 0);
  // accent-color inherits, so a :root/html/body declaration also reaches the checkbox.
  const v = [...rulesFor(rules, "input[type=checkbox]"), ...rulesFor(rules, "body"), ...rules.filter(isTokenBlock)]
    .sort((a, b) => a.order - b.order).flatMap((r) => r.decls).filter(([p]) => p === "accent-color").pop()?.[1];
  assert.equal(v?.replace(/\s/g, ""), "var(--accent)", `checkbox accent-color is ${v ?? "(not set)"}`);
});

test('AC-DS-R7 buttons are words only: no 🎙, ■ or ▶; "Speak", "Stop voice", "Play again"', () => {
  const src = markupAndScript();
  const glyphs = [..."🎙■▶"].filter((g) => src.includes(g));
  assert.deepEqual(glyphs, [], "icon glyphs still in the page markup or script strings");
  for (const [re, label] of [
    [/<button\b[^>]*\bid=["']mic["'][^>]*>\s*Speak\s*<\/button>/, '#mic says "Speak"'],
    [/<button\b[^>]*\bid=["']hush["'][^>]*>\s*Stop voice\s*<\/button>/, '#hush says "Stop voice"'],
    [/<button\b[^>]*class=["']speak["'][^>]*>\s*Play again\s*<\/button>/, '.speak says "Play again"'],
  ] as const) assert.match(src, re, label);
});
