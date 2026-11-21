// 문장 틀 채우기 — packages/data(웹 복사본 web/data) 의 「{자리}」를 API 숫자 · 코드로 채운다.
// 화면 문구는 프론트가 갖는다(DECISIONS 2026-11-04). 서버 문장 필드는 옛 앱용이고 웹은 코드가 없을 때만 그것을 쓴다.

export type Vars = Record<string, string | number | null | undefined>;

/** 틀의 자리를 채운다. 채울 값이 하나라도 없으면 null — 부르는 쪽이 서버 문장으로 떨어진다(빈 자리를 내보내지 않는다). */
export function fill(template: string | null | undefined, vars: Vars = {}): string | null {
  if (template == null) return null;
  let missing = false;
  const out = template.replace(/\{([^{}]+)\}/g, (_m, k: string) => {
    const v = vars[k];
    if (v == null || v === '') {
      missing = true;
      return '';
    }
    return String(v);
  });
  return missing ? null : out;
}

/** 마지막 한글 음절에 받침이 있는가 — 괄호 꼬리표 · 숫자는 건너뛴다(서버 peers._josa 와 같은 규칙). */
export function hasBatchim(word: string): boolean {
  for (let i = word.length - 1; i >= 0; i--) {
    const c = word.charCodeAt(i);
    if (c >= 0xac00 && c <= 0xd7a3) return (c - 0xac00) % 28 !== 0;
  }
  return false;
}

/** 조사 — 받침이 있으면 `withB`(과 · 은 · 이), 없으면 `without`(와 · 는 · 가). */
export const josa = (word: string, withB: string, without: string) => (hasBatchim(word) ? withB : without);

/** 1회분 · 포장 양 — 정수면 정수, 아니면 소수 한 자리(「30」 · 「12.5」). */
export function amount(v: number): string {
  return Number.isInteger(v) ? String(v) : String(Math.round(v * 10) / 10);
}

/** 「」로 감싸 쉼표로 잇는다 — 원재료 이름 목록(「소금」, 「간장」). */
export const quoted = (xs: string[]) => xs.map((x) => `「${x}」`).join(', ');
