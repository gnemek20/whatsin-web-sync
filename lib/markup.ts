// 문구 서식 — 모든 글자(Txt)가 읽는 작은 마크다운 + 수식(2026-11-02 사용자 「br·서식문자로 깔끔하게 · KaTeX」).
//   \n        줄바꿈            **굵게**   핵심 숫자·단어만
//   "- " 줄    목록(•)           $…$       수식(KaTeX 문법) — 단위·관계만. 예: $1\,\text{공기} = 69\,\text{g}$
// 앱 app/src/ui/markup.ts 와 같은 파서(복사본 — 두 패키지가 코드를 나누지 않는다. 고치면 둘 다).
// 웹은 수식을 KaTeX 로 그린다(components/Rich.tsx). texToText 는 aria·메타 설명처럼 글자만 필요한 자리에.

export type Seg = { kind: "text" | "bold" | "math"; text: string };
export type Line = { bullet: boolean; segs: Seg[] };

const MARK = /\*\*|\$|\n|^- /m;
export const hasMarkup = (s: string) => MARK.test(s);

// 한 줄 안 — **굵게** 와 $수식$ 을 가른다. 짝이 안 맞으면 글자 그대로.
function inline(s: string): Seg[] {
  const out: Seg[] = [];
  const re = /\*\*(.+?)\*\*|\$(.+?)\$/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push({ kind: "text", text: s.slice(last, m.index) });
    out.push(m[1] != null ? { kind: "bold", text: m[1] } : { kind: "math", text: m[2] });
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({ kind: "text", text: s.slice(last) });
  return out;
}

export function parseMarkup(s: string): Line[] {
  return s.split("\n").map((raw) => {
    const bullet = raw.startsWith("- ");
    return { bullet, segs: inline(bullet ? raw.slice(2) : raw) };
  });
}

// 수식 원문 → 글자. 우리가 쓰는 범위(단위 · 관계 · 분수 · 첨자)만 — 모르는 명령은 이름을 지우고 글자만 남긴다.
const SYM: Record<string, string> = {
  times: "×", cdot: "·", approx: "≈", le: "≤", leq: "≤", ge: "≥", geq: "≥", neq: "≠", ne: "≠",
  to: "→", rightarrow: "→", leftarrow: "←", pm: "±", div: "÷", sim: "~", lt: "<", gt: ">",
  downarrow: "↓", uparrow: "↑", infty: "∞", "%": "%", ldots: "…", cdots: "…",
};
const SUP: Record<string, string> = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "+": "⁺", "-": "⁻" };
const SUB: Record<string, string> = { "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉", "+": "₊", "-": "₋" };
const mapChars = (s: string, table: Record<string, string>) => [...s].map((c) => table[c] ?? c).join("");

export function texToText(tex: string): string {
  let s = tex;
  s = s.replace(/\\(?:text|mathrm|textbf|mathbf|operatorname)\{([^}]*)\}/g, "$1");
  s = s.replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, "$1/$2");
  s = s.replace(/\^\{([^}]*)\}|\^(\S)/g, (_m, a, b) => mapChars(a ?? b, SUP));
  s = s.replace(/_\{([^}]*)\}|_(\S)/g, (_m, a, b) => mapChars(a ?? b, SUB));
  // 얇은 공백(\,)은 붙인다 — 한국어 표기는 「69g」·「1공기」. 넓은 공백(\; \quad ~)만 띄운다.
  s = s.replace(/\\[,!]/g, "").replace(/\\[;:]|\\quad|~|\\ /g, " ");
  s = s.replace(/\\([a-zA-Z]+|%)/g, (_m, name) => SYM[name] ?? "");
  s = s.replace(/[{}]/g, "");
  return s.replace(/\s+/g, " ").trim().replace(/ ?= ?/g, " = ");
}

// 한 줄 칸(fit)처럼 서식을 그릴 수 없는 자리 — 글자만.
export function plainOf(s: string): string {
  return parseMarkup(s)
    .map((l) => (l.bullet ? "• " : "") + l.segs.map((g) => (g.kind === "math" ? texToText(g.text) : g.text)).join(""))
    .join(" ");
}
