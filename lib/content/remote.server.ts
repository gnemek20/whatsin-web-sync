// CDN(Cloudflare R2 · 버킷 whatsin-data) 의 최신 화면 데이터로 web/data 복사본을 **제자리에서** 갱신한다(서버 전용 · 2026-11-04).
// 정본은 packages/data, 배포는 infra/cdn(npm run deploy). 웹을 다시 배포하지 않아도 문구 · 성분 사전이 바뀐다.
//   · 판 확인(latest.json)은 60초 재검증 캐시 · 파일은 해시 경로라 영구 캐시(Next fetch 캐시)
//   · 이미 import 된 JSON 객체의 **안쪽을 바꾼다** — 참조(구조 분해한 하위 객체 포함)가 그대로 새 값을 본다
//   · CDN 에 못 닿으면 아무것도 안 바꾼다 → 빌드에 든 복사본 그대로(화면은 늘 뜬다)
// 클라이언트 번들에 든 작은 낱말(axes.json 의 축 이름 등)은 다음 배포 때 바뀐다 — 화면 문구 대부분은 서버에서 만든다(localize.server).
// 끄기: WHATSIN_DATA_URL=off · 주소 바꾸기: WHATSIN_DATA_URL=https://…
import 'server-only';
import axes from '@/data/axes/axes.json';
import caveats from '@/data/axes/caveats.json';
import dataIssues from '@/data/axes/data-issues.json';
import scoreNotes from '@/data/axes/score-notes.json';
import avoidGuide from '@/data/guide/avoid-guide.json';
import collections from '@/data/guide/collections.json';
import peers from '@/data/guide/peers.json';
import processedMeat from '@/data/guide/processed-meat.json';
import concerns from '@/data/ingredients/concerns.json';
import dictionary from '@/data/ingredients/dictionary.json';
import kinds from '@/data/ingredients/kinds.json';
import carb from '@/data/nutrition/carb.json';
import nutrients from '@/data/nutrition/nutrients.json';
import bundled from '@/data/_manifest.json';
import { DATA_URL } from '../config.server';

const TARGETS: Record<string, unknown> = {
  'axes/axes.json': axes, 'axes/caveats.json': caveats, 'axes/data-issues.json': dataIssues, 'axes/score-notes.json': scoreNotes,
  'guide/avoid-guide.json': avoidGuide, 'guide/collections.json': collections, 'guide/peers.json': peers,
  'guide/processed-meat.json': processedMeat, 'ingredients/concerns.json': concerns, 'ingredients/dictionary.json': dictionary,
  'ingredients/kinds.json': kinds, 'nutrition/carb.json': carb, 'nutrition/nutrients.json': nutrients,
};

type Manifest = { version: string; files: Record<string, { hash: string; url: string }> };
// 경로 → 지금 메모리에 든 판의 해시. 처음엔 빌드에 든 복사본(web/data/_manifest.json · data-sync 가 만든다) — 같으면 받지 않는다.
const applied = new Map<string, string>(Object.entries((bundled as { files: Record<string, string> }).files));
let inflight: Promise<void> | null = null;

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
// 받은 값으로 대상 객체를 제자리에서 맞춘다 — 하위 객체 · 배열도 같은 참조를 유지한다.
export function mergeInPlace(target: Record<string, unknown>, src: Record<string, unknown>): void {
  for (const k of Object.keys(target)) if (!(k in src)) delete target[k];
  for (const [k, v] of Object.entries(src)) {
    const cur = target[k];
    if (isObj(cur) && isObj(v)) mergeInPlace(cur, v);
    else if (Array.isArray(cur) && Array.isArray(v)) cur.splice(0, cur.length, ...v);
    else target[k] = v;
  }
}

async function run(): Promise<void> {
  const r = await fetch(`${DATA_URL}/latest.json`, { next: { revalidate: 60 }, signal: AbortSignal.timeout(2500) });
  if (!r.ok) return;
  const m = (await r.json()) as Manifest;
  await Promise.all(Object.entries(m.files).map(async ([path, f]) => {
    const target = TARGETS[path];
    if (!isObj(target) || applied.get(path) === f.hash) return;
    const fr = await fetch(`${DATA_URL}/${f.url}`, { cache: 'force-cache', signal: AbortSignal.timeout(5000) });
    if (!fr.ok) return;
    const body = await fr.json();
    if (isObj(body)) {
      mergeInPlace(target, body);
      applied.set(path, f.hash);
    }
  }));
}

/** 응답을 화면 문구로 바꾸기 전에 부른다(lib/api). 같은 시점의 요청은 한 번만 확인한다. 실패해도 조용히 넘어간다. */
export async function syncContent(): Promise<void> {
  if (!DATA_URL) return;
  inflight ??= run().catch(() => undefined).finally(() => { inflight = null; });
  return inflight;
}
