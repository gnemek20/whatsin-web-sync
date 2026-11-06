// API 응답 → 화면 문구(서버 전용 · lib/api 가 부른다). 「문구는 프론트가 갖는다」(DECISIONS 2026-11-04).
// 서버는 코드와 숫자를 보내고 옛 앱(1.1.x)을 위해 문장 필드도 그대로 보낸다. 웹은 코드로 web/data 의 문장을 만들어 그 필드를
// 덮어쓰고, 코드가 없거나 모르는 코드면 서버 문장을 그대로 둔다 — 화면 컴포넌트는 지금처럼 label · reason · note · plain 을 읽는다.
// 성분 사전(290 kB)을 읽으므로 이 파일은 서버에서만 돈다('server-only').
import 'server-only';
import collectionsJson from '@/data/guide/collections.json';
import processedMeat from '@/data/guide/processed-meat.json';
import type {
  Alternative,
  Axis,
  CollectionOption,
  IngredientDetail,
  PeerPosition,
  ProductAxes,
  ProductDetail,
  ProductSummary,
  ScorePart,
  SearchResult,
} from '../types';
import { additivesNote, baseNote, glycemicNote, labelText, nutritionNote, partLabel, partNote, reasonText, type AxisKey } from './axes';
import { carbAnalogy, riceLabel } from './carb';
import { localizeIngredient } from './ingredients.server';
import { basisLabel, dailySentence, metricText, sortLabel } from './nutrients';
import { peerSilentText } from './peers';

type AxisCtx = { additiveNames?: string[] | null; additiveCount?: number | null };

function axis(key: AxisKey, a: Axis, ctx: AxisCtx = {}): Axis {
  let label: string | null;
  if (key === 'glycemic' && a.band === 'amount' && typeof a.carb_g === 'number') {
    // 원물 비유(「사과 1개」 · 「감자 반 개」) — 아주 적으면 공기 분수. 서버 저장 문구(「밥 0.07공기분」)는 재채점 전 옛 문구다.
    label = carbAnalogy(a.carb_g, a.sugars_g ?? null)?.text ?? (typeof a.carb_rice_bowls === 'number' ? riceLabel(a.carb_rice_bowls) : null);
  } else {
    label = labelText(key, a);
  }
  const note =
    key === 'nutrition' ? nutritionNote(a)
      : key === 'glycemic' ? glycemicNote(a)
        : a.band === 2 ? additivesNote(ctx.additiveCount ?? a.additive_count, ctx.additiveNames)
          : null;
  return { ...a, label: label ?? a.label, reason: reasonText(a) ?? a.reason, note: note ?? a.note };
}

export function localizeAxes(axes: ProductAxes | null | undefined, ctx?: AxisCtx): ProductAxes | null | undefined {
  if (!axes) return axes;
  return {
    nutrition: axis('nutrition', axes.nutrition, ctx),
    glycemic: axis('glycemic', axes.glycemic, ctx),
    ingredient: axis('ingredient', axes.ingredient, ctx),
  };
}

const parts = (ps: ScorePart[]) => ps.map((p) => ({ ...p, label: partLabel(p), note: partNote(p) }));

export function localizeSummary<T extends ProductSummary>(p: T): T {
  return p.axes ? { ...p, axes: localizeAxes(p.axes) } : p;
}

export function localizeProduct(p: ProductDetail): ProductDetail {
  const sd = p.score_detail;
  const axes = localizeAxes(p.axes, { additiveNames: sd?.additive_names });
  const unit = p.nutrition.per100?.unit;
  const dv = p.daily_value;
  return {
    ...p,
    axes,
    score_detail: sd
      ? {
          ...sd,
          base_parts: parts(sd.base_parts ?? []),
          base_note: baseNote(axes?.nutrition, sd.base_parts ?? [], (sd.base_parts ?? []).some((x) => x.flags?.includes('fats')), sd.base_note),
        }
      : sd,
    nutrition: {
      ...p.nutrition,
      basis_label: basisLabel(p.nutrition.basis, p.nutrition.basis_g, unit) ?? p.nutrition.basis_label,
    },
    daily_value: dv
      ? { ...dv, items: dv.items.map((it) => ({ ...it, sentence: dailySentence(dv.basis, it.nutrient, it.pct, it.over_daily) ?? it.sentence })) }
      : dv,
    ingredients: p.ingredients.map(localizeIngredient),
    flagged: p.flagged.map(localizeIngredient),
    // 가공육 안내(IARC) — 서버는 있다는 것만 알리면 된다. 문구는 guide/processed-meat.json.
    processed_meat: p.processed_meat ? { ...p.processed_meat, ...pickMeat() } : p.processed_meat,
  };
}

function pickMeat() {
  const { label, summary, detail, source } = processedMeat;
  return { label, summary, detail, source };
}

export const localizeAlternatives = (xs: Alternative[]) => xs.map((a) => (a.axes ? { ...a, axes: localizeAxes(a.axes) } : a));

export function localizeSearch(r: SearchResult): SearchResult {
  const key = r.sort?.key;
  return {
    ...r,
    sort_label: sortLabel(r.sort) ?? r.sort_label,
    items: r.items.map((it) => ({ ...localizeSummary(it), metric: metricText(key, it.metric_value, it.metric_unit) ?? it.metric })),
  };
}

export function localizePeers(p: PeerPosition): PeerPosition {
  return p.status === 'silent' ? { ...p, reason: peerSilentText(p) } : p;
}

export function localizeIngredientDetail(d: IngredientDetail): IngredientDetail {
  return { ...localizeIngredient(d), found_in: d.found_in.map(localizeSummary) };
}

// 둘러보기 컬렉션 — 이름 · 설명은 guide/collections.json. 모르는 id 는 서버 문구에서 등급 글자(「(A·B)」)만 뗀다.
const COLL = new Map(collectionsJson.collections.map((c) => [c.id, c]));
export const localizeCollections = (xs: CollectionOption[]) =>
  xs.map((c) => {
    const l = COLL.get(c.id);
    return l ? { ...c, label: l.label, desc: l.desc } : { ...c, label: c.label.replace(/\s*\([A-E·,\s]+\)\s*/g, '').trim() };
  });
