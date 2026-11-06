// 「같은 종류와 견주면」 카드 문구 — 정본 web/data/guide/peers.json. API(GET /products/{id}/peers)는 status · reason_code · n · better ·
// better_per100 · group 을 보내고 문장은 여기서 만든다. 조사(와/과 · 은/는)는 앞말 받침으로 고른다.
import peers from '@/data/guide/peers.json';
import type { PeerAxis, PeerKey, PeerPosition, PeerSummary } from '../types';
import { AXIS_NAME } from './axes';
import { fill, josa } from './text';

// TODO(data): move to packages/data/guide/peers.json — 웹 카드의 머리 · 큰 줄 · 기준일(앱 카드와 같은 짜임).
export const PEER_WEB = {
  of: '같은 {group} {n}개 중',
  by_axis: '축별 비교',
  axis_silent: '비교 안 함',
  // 축 이름 옆 칸이라 짧게(peers.json axis.best 「가장 좋은 칸」 · better 「더 좋은 칸 {pct}」는 축 이름 없이 홀로 서는 서버 label 용)
  axis_best: '가장 좋음',
  axis_better: '나은 제품 {pct}',
  glycemic_better: '더 적은 제품 {pct}',
  as_of: '{m}월 {d}일 기준',
  group_default: '제품',
};

/** 「같은 콜라와 견주면」 */
export const peerTitle = (group: string | null | undefined) =>
  group ? fill(peers.title.replace('{와과}', josa(group, '과', '와')), { group }) : null;

export const headlineNote = () => peers.headline_note;

const pctText = (p: number) => (p === 0 ? peers.one_pct_under : `${p}%`);

type AxisTierCopy = Record<string, Record<string, string>> & { silent: string };
const axisTierCopy = () => (peers as unknown as { axis_tier?: AxisTierCopy }).axis_tier;

/** 축 한 줄 — 같은 종류 안 위치를 말로(「좋은 편」 · 「주의 성분 많은 편」 · 「적은 편」 · 2026-11-05 사용자 「비율 말고 한줄 평으로」).
 *  tier 가 없는 옛 응답 · 옛 CDN 판이면 비율 문구(「나은 제품 54%」)로 돌아간다. */
export function peerAxisText(a: PeerAxis): { text: string; best: boolean; why: string | null } {
  const T = axisTierCopy();
  if (a.status !== 'ok' || a.better_per100 == null) return { text: T?.silent ?? PEER_WEB.axis_silent, best: false, why: peerAxisSilent(a) };
  if (T && a.tier) return { text: T[a.key]?.[a.tier] ?? '', best: a.tier === 'good', why: null };
  const g = a.key === 'glycemic';
  if (a.better === 0) return { text: g ? peers.axis.glycemic_best : PEER_WEB.axis_best, best: true, why: null };
  return { text: fill(g ? PEER_WEB.glycemic_better : PEER_WEB.axis_better, { pct: pctText(a.better_per100) })!, best: false, why: null };
}

function peerAxisSilent(a: PeerAxis): string | null {
  const t = (peers.axis_silent as Record<string, string>)[a.reason_code ?? ''];
  return t ? fill(t, { axis: AXIS_NAME[a.key], min: peers.min_n }) : a.label || null;
}

/** 견주지 못한 이유 — 코드를 모르거나 틀이 묶음 이름을 요구하는데 없으면 서버 문장. */
export function peerSilentText(p: PeerPosition): string | null {
  const t = (peers.silent as Record<string, string>)[p.reason_code ?? ''];
  return (t ? fill(t, { group: p.group, min: peers.min_n }) : null) ?? p.reason;
}

export function peerAsOf(d: string | null | undefined): string | null {
  const m = d?.match(/^\d{4}-(\d{2})-(\d{2})/);
  return m ? fill(PEER_WEB.as_of, { m: Number(m[1]), d: Number(m[2]) }) : null;
}

// ── 순위 · 한줄 평(2026-11-05 사용자 「비슷한 식품 중 N등 · 세 축 기반 한줄 평」) ─────────────────────────────
// 문장 재료는 API PeerSummary(scope · good · weak · middle), 말은 peers.json rank · summary. 앱 format/peerSummary.ts 와 같은 규칙.
type Phrase = { and: string; but: string; end: string };
type ScopeCopy = { good: Record<string, Phrase>; weak: Record<string, Phrase>; middle: Record<string, Phrase>; all_good?: string; all_weak?: string; all_middle: string; some_middle: string };
// 부를 때 읽는다 — CDN 판이 이 객체를 제자리에서 바꾼다(모듈 상수로 잡으면 갱신을 못 본다 · infra/cdn/README). 옛 판에는 없을 수 있다.
const sum = () => (peers as unknown as { summary?: { peer: ScopeCopy; self: ScopeCopy; self_note: string } }).summary;
type RankBadge = { first: string; top10: string; top30: string; mid: string };
// 순위 옆 알약(2026-11-06 사용자 「오락적이고 기분 좋게」) — 1등 · 상위 10 % · 30 % · 60 % 안이면 그 말, 그 밖은 알약 없음(낮은 순위를 깎아내리지 않는다).
// 옛 CDN 판에 badge 가 없으면 예전 「상위 N%」.
export function rankBadge(rank: number, pct: number | null | undefined, B: RankBadge | undefined, top: string): string | null {
  if (!B) return pct != null && rank > 1 ? fill(top, { pct }) ?? null : null;
  // 「가장 나은 선택」은 셋 다 나은 제품이 없고(rank 1) 백분위도 상위 10 % 안일 때만 — 엇갈리는 제품이 많으면 과장이다(2026-11-06).
  if (rank === 1 && pct != null && pct <= 10) return B.first;
  if (pct == null) return null;
  return pct <= 10 ? B.top10 : pct <= 30 ? B.top30 : pct <= 60 ? B.mid : null;
}
const rankCopy = () => (peers as unknown as { rank?: { head: string; value: string; top: string; note: string; note_first: string; badge?: RankBadge } }).rank;

/** 「영양 구성이 좋고 당질이 적은 편이지만」 — 앞 항목은 and, 마지막은 but(뒤에 아쉬운 쪽이 온다) 또는 end. */
function joinPhrases(c: ScopeCopy, kind: 'good' | 'weak' | 'middle', keys: PeerKey[], last: 'but' | 'end'): string {
  return keys.map((k, i) => c[kind][k]?.[i < keys.length - 1 ? 'and' : last]).filter(Boolean).join(' ');
}

/** 한줄 평 — 「당질이 적은 편이지만, 주의 성분이 많은 편입니다.」 · 재료가 없으면 null. */
export function peerSummaryText(s: PeerSummary | null | undefined): string | null {
  const c = s ? sum()?.[s.scope] : undefined;
  if (!s || !c) return null;
  const total = s.good.length + s.weak.length + s.middle.length;
  if (total === 3 && s.good.length === 3 && c.all_good) return c.all_good;
  if (total === 3 && s.weak.length === 3 && c.all_weak) return c.all_weak;
  if (s.good.length && s.weak.length) return `${joinPhrases(c, 'good', s.good, 'but')}, ${joinPhrases(c, 'weak', s.weak, 'end')}`;
  if (s.good.length) return joinPhrases(c, 'good', s.good, 'end');
  if (s.weak.length) return joinPhrases(c, 'weak', s.weak, 'end');
  if (s.middle.length >= 2) return s.middle.length === 3 ? c.all_middle : c.some_middle;
  return s.middle.length ? joinPhrases(c, 'middle', s.middle, 'end') : null;
}

export const peerSelfNote = () => sum()?.self_note ?? '';

/** 「비슷한 콜라 80개 중」 · 「3등」 · 「상위 4%」 · 정의 한 줄 */
export function peerRank(p: PeerPosition): { head: string; value: string; top: string | null; note: string } | null {
  const R = rankCopy();
  if (p.rank == null || p.rank_of == null || !R) return null;
  return {
    head: fill(R.head, { group: p.group ?? PEER_WEB.group_default, n: p.rank_of.toLocaleString('ko-KR') })!,
    value: (p.top_pct != null ? fill(R.value, { pct: p.top_pct }) : fill(R.value, { rank: p.rank.toLocaleString('ko-KR') }))!,
    top: rankBadge(p.rank, p.top_pct, R.badge, R.top),
    note: p.rank === 1 ? R.note_first : R.note,
  };
}
