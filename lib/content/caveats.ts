// 한계(caveats) 코드 → 사람 말 — 정본 web/data/axes/caveats.json. 섭취량 슬라이더(브라우저)도 쓰므로 이 JSON 하나만 읽는다.
// issue_fields(「값 넣어 보기」 칸)는 웹에 what-if 화면이 없어 읽지 않는다 — 이름을 골라 가져와 번들에서 뺀다.
import caveats from '@/data/axes/caveats.json';

// 기본 가져오기로 읽는다 — 이름 가져오기(`{ quiet }`)는 브라우저 번들에서 `quiet.includes` 를 내보내기로 착각해 경고를 낸다(2026-11-13).
const CAVEAT_TEXT = caveats.text as Record<string, string>;
const QUIET = { has: (c: string) => (caveats.quiet as string[]).includes(c) }; // 부를 때 본다(CDN 새 판)

/**
 * 한계 코드 → 사람 말. 모르는 코드는 내지 않는다(원문 코드 노출 금지).
 * `userAmount` — 사용자가 양을 직접 고르면 「한 포장 기준」은 더는 참이 아니다.
 * `skip` — 다른 줄(축 note)이 이미 말한 코드.
 */
export function splitCaveats(codes: string[] | undefined | null, userAmount = false, skip: string[] = []) {
  const known = (codes ?? []).filter((c) => CAVEAT_TEXT[c] && !skip.includes(c) && !(userAmount && c === 'diluted_total_content'));
  return {
    loud: known.filter((c) => !QUIET.has(c)).map((c) => CAVEAT_TEXT[c]),
    quiet: known.filter((c) => QUIET.has(c)).map((c) => CAVEAT_TEXT[c]),
  };
}

