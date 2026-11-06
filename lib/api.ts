// What's In? 백엔드(FastAPI) 얇은 클라이언트 — 웹은 **서버에서** 부른다(SSR · 재검증 캐시). 서버 전용('server-only').
// 브라우저 코드가 API 주소만 필요하면 lib/config 를 쓴다.
// 응답의 화면 문구는 여기서 한 번에 정리한다(lib/content/localize.server) — 코드 + web/data 로 문장을 만들고, 코드가 없을 때만
// 서버 문장을 쓴다. 같은 요청 안에서 두 번 부르면(generateMetadata + 페이지) React cache 가 한 번만 받고 한 번만 정리한다.
import 'server-only';
import { cache } from 'react';
import { API_BASE } from './config';
import {
  localizeAlternatives,
  localizeCollections,
  localizeIngredientDetail,
  localizePeers,
  localizeProduct,
  localizeSearch,
  localizeSummary,
} from './content/localize.server';
import { localizeIngredientOfDay } from './content/ingredients.server';
import { syncContent } from './content/remote.server';
import type {
  Alternative,
  CollectionOption,
  IngredientDetail,
  IngredientOfDay,
  PeerPosition,
  ProductDetail,
  ProductSummary,
  SearchResult,
} from './types';

export { API_BASE };

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
  ) {
    super(detail);
  }
}

/** 결과 하나 — 「비어 있음」과 「연결 실패」를 섞지 않으려고 실패를 값으로 돌려준다. */
export type Result<T> = { ok: true; data: T } | { ok: false; status: number };

// 서버 문장(코드가 없을 때 쓰는 옛 문구)의 「 · 」 구분자 → 쉼표. 채점 때 저장된 문구는 재채점 전까지 「A · B」로 온다(DESIGN_RULES §0-7).
function dedot(v: unknown): unknown {
  if (typeof v === 'string') return v.includes('·') ? v.replace(/\s*·\s*/g, ', ') : v;
  if (Array.isArray(v)) {
    for (let i = 0; i < v.length; i++) v[i] = dedot(v[i]);
    return v;
  }
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    for (const k of Object.keys(o)) o[k] = dedot(o[k]);
  }
  return v;
}

async function api<T>(path: string, revalidate: number): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: 'application/json' },
    next: { revalidate },
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = (await res.json()).detail ?? detail;
    } catch {
      /* non-JSON body */
    }
    throw new ApiError(res.status, String(detail));
  }
  return dedot(await res.json()) as T;
}

async function attempt<T>(path: string, revalidate: number, shape?: (d: T) => T): Promise<Result<T>> {
  try {
    // 화면 데이터(CDN 최신 판)를 맞춘 뒤 문구를 만든다 — 판 확인과 API 호출을 같이 띄운다(기다림이 늘지 않게).
    const [d] = await Promise.all([api<T>(path, revalidate), shape ? syncContent() : undefined]);
    return { ok: true, data: shape ? shape(d) : d };
  } catch (e) {
    return { ok: false, status: e instanceof ApiError ? e.status : 0 };
  }
}

const enc = encodeURIComponent;
const summaries = (xs: ProductSummary[]) => xs.map(localizeSummary);

export const searchProducts = (q: string) => attempt<ProductSummary[]>(`/products/search?q=${enc(q)}`, 300, summaries);

// 뜻 검색 + 정렬 코드(sort)와 줄 세운 값(metric_value) — 문구(「당류 낮은 순, 100g(mL)당」 · 「당류 2g/100g」)는 웹이 만든다(API.md §3).
export const searchV2 = cache((q: string) => attempt<SearchResult>(`/products/search/v2?q=${enc(q)}`, 300, localizeSearch));

// 요즘 많이 찾는 제품 — 실제 검색으로 연 제품의 빈도. 데이터가 없으면 [](섹션을 숨긴다 · 앱 SearchScreen 과 같다).
export const getPopular = (limit = 5) => attempt<ProductSummary[]>(`/products/popular?limit=${limit}`, 1800, summaries);

// 비슷한 상품 — 점수와 무관한 원재료·종류 유사도. 대안(더 나음)과 뜻이 다르다.
export const getSimilar = cache((id: string) => attempt<Alternative[]>(`/products/${enc(id)}/similar`, 3600, localizeAlternatives));

export const browseCollection = (id: string) => attempt<ProductSummary[]>(`/products?collection=${enc(id)}`, 3600, summaries);

export const getProduct = cache((id: string) => attempt<ProductDetail>(`/products/${enc(id)}`, 3600, localizeProduct));

// 넉넉히(16) — 「다른 선택」이 목적별로 다시 줄 세운다(2026-11-03).
export const getAlternatives = cache((id: string) =>
  attempt<Alternative[]>(`/products/${enc(id)}/alternatives?limit=16`, 3600, localizeAlternatives),
);

// 같은 종류와 견주면 — 견줄 수 없으면 200 + status "silent". 처음 한 번은 서버가 수 초 걸릴 수 있어 페이지는 따로 기다린다(Suspense).
export const getPeers = cache((id: string) => attempt<PeerPosition>(`/products/${enc(id)}/peers`, 3600, localizePeers));

// 아직 준비되지 않은 컬렉션은 서버가 내려 줘도 화면에 내지 않는다(2026-11-02 사용자 · 앱 data/collections 와 같은 목록).
const NOT_READY = new Set(['good_grade', 'high_protein']);
export const getCollections = cache(() =>
  attempt<CollectionOption[]>('/meta/collections', 86400, (xs) => localizeCollections(xs.filter((c) => !NOT_READY.has(c.id)))),
);

export const getIngredientOfDay = cache(() => attempt<IngredientOfDay>('/meta/ingredient-of-the-day', 3600, localizeIngredientOfDay));

export const getIngredient = cache((name: string) => attempt<IngredientDetail>(`/ingredients/${enc(name)}`, 86400, localizeIngredientDetail));
