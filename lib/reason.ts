// 대안 사유 정리 — 클라이언트(다른 선택 탭)도 쓰므로 문구 사전과 떨어진 작은 파일.
// 서버 reason 은 v2 경로에서 레거시 종합점수·등급(「A등급」「100점」「10점 더 좋아요」)을 담아 온다(코드 필드 없음 — 서버 문장만 있다).
// A~E·점수는 소비자에게 내지 않는다(DECISIONS 2026-09-14) — 그 조각만 걷고 나머지는 그대로 둔다.
// tradeoff 는 끝에 「 · tradeoff」로 붙어 오므로 떼고 따로 그린다(API.md §Alternative).
export function cleanReason(reason: string, tradeoff: string): string {
  let r = reason.trim();
  if (tradeoff && r.endsWith(tradeoff)) r = r.slice(0, -tradeoff.length).replace(/\s*[·,]\s*$/, ''); // lib/api 가 「 · 」를 「, 」로 바꿔 오기도 한다
  const scoreish = /등급|^\d+점$|\d+점 더|유사도|점수/;
  // 괄호 안 조각: 점수·등급·유사도는 빼고 사실(당류 −3g/100g 등)만 남긴다.
  r = r.replace(/\s*\(([^)]*)\)/g, (_m, inner: string) => {
    const keep = inner.split('·').map((s) => s.trim()).filter((s) => s && !scoreish.test(s));
    return keep.length ? `\n${keep.join('\n')}` : '';
  });
  // 띄운 가운뎃점(「 · 」)과 줄바꿈만 사실 경계로 본다 — 붙은 「당류·나트륨」은 한 덩어리. 사실은 한 줄에 하나(§0-7).
  const parts = r.split(/\s+·\s+|\n/).map((s) => s.trim()).filter((s) => s && !scoreish.test(s));
  return parts.join('\n').replace(/\s*·\s*/g, ', '); // 붙은 가운뎃점도 내보내지 않는다(엄격 · 2026-11-02 사용자)
}

