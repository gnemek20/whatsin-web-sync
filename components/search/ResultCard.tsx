// 검색 결과 · 둘러보기 카드(2026-11-17 전면 개편) — 세로 카드: 사진 칸 · 이름(두 줄 자리) · 제조사, 종류 · (고른 기준 값 한 줄) · 사실 세 줄.
//   사실 세 줄 — 내 기준이 있으면 내 기준 숫자(100g(mL)당), 없으면 세 축(영양 균형 · 원재료 · 당질). 알약 나열 대신 이름 | 값 줄.
//   피할 성분이 들어 있으면 사진 칸 아래에 붉은 띠(「⚠ 말티톨」 — 「피하는」 말은 붙이지 않는다 · 2026-11-17 사용자).
//   찾은 말과 이름이 같은 제품은 「찾은 제품」 표시 + 주황 테두리(어느 정렬에서도 맨 앞 — lib/sort.namePin).
//   카드 순위 숫자는 없다(사용자 2026-11-17).
import Link from 'next/link';
import type React from 'react';
import { FoodTile, foodKind } from '@/components/FoodTile';
import { Icon } from '@/components/Icon';
import { brandName } from '@/components/ProductRow';
import { toneOf } from '@/lib/bands';
import { AXIS_NAME, CARB_NONE, SHORT_WORD } from '@/lib/content/words';
import type { LensRow } from '@/lib/facts';
import type { ProductSummary } from '@/lib/types';
import s from './results.module.css';

/** 사실 한 줄 — value: 문자열(값) · null(모름 「—」) · undefined(아직 받는 중) */
export type Fact = { label: string; value: string | null | undefined; tone?: number | null };

function carbText(p: ProductSummary): string | null {
  const g = p.axes?.glycemic;
  if (!g) return null;
  if (g.band === 'n/a') return CARB_NONE;
  if (g.band !== 'amount' || g.carb_g == null) return null;
  return `${g.carb_g < 10 ? Math.round(g.carb_g * 10) / 10 : Math.round(g.carb_g)}g`;
}

/** 세 축 세 줄(내 기준이 없을 때). 세 축이 안 실려 오면 빈 목록(카드가 「판독 준비 중」을 쓴다). */
export function axisFacts(p: ProductSummary): Fact[] {
  if (!p.axes) return [];
  const n = toneOf('nutrition', p.axes.nutrition);
  const i = toneOf('ingredient', p.axes.ingredient);
  return [
    { label: AXIS_NAME.nutrition, value: n ? SHORT_WORD(n, 'nutrition') : null, tone: n },
    { label: AXIS_NAME.ingredient, value: i ? SHORT_WORD(i) : null, tone: i },
    { label: `1회분 ${AXIS_NAME.glycemic}`, value: carbText(p) },
  ];
}

/** 내 기준 숫자 줄(100g(mL)당). 상세를 아직 못 받았으면 labels 만 주고 값은 undefined(받는 중). */
export function lensFacts(row: LensRow | null, labels: string[]): Fact[] {
  if (!row) return labels.map((label) => ({ label, value: undefined }));
  return row.nums.map((n) => ({ label: n.label, value: n.has || n.text !== '-' ? n.text : null }));
}

export function ResultCard({
  p,
  facts,
  hits,
  notes,
  pinned = false,
}: {
  p: ProductSummary;
  facts: Fact[];
  hits?: string[];
  notes?: Record<string, string>;
  pinned?: boolean;
}) {
  const brand = brandName(p.brand);
  const kind = foodKind(p.sub);
  return (
    <Link
      href={`/p/${p.id}`}
      className={`${s.card} ${pinned ? s.cardPin : ''}`}
      data-ev="result_click"
      data-tid={p.id}
      style={{ ['--m-bg' as string]: `var(--tile-${kind}-bg)`, ['--m-ink' as string]: `var(--tile-${kind}-ink)` } as React.CSSProperties}
    >
      {/* 사진 칸 — 식품 종류 색 면 위에 사진을 흰 타일로 띄운다(2026-11-17 사용자 「심심하다」) */}
      <span className={`${s.media} ${p.image_url ? s.mediaPhoto : ''}`}>
        <FoodTile type={p.sub} src={p.image_url} size={104} />
        {pinned ? (
          <span className={s.pin}>
            <Icon name="check" size={13} strokeWidth={2.6} />
            찾은 제품
          </span>
        ) : null}
        {hits?.length ? (
          <span className={s.hit}>
            <Icon name="alert" size={14} strokeWidth={2} />
            {/* 무엇이 · 얼마나(100g당) — 첫 피할 성분의 원재료 이름 한 줄 + 양 한 줄, 나머지는 「외 N개」(사진을 다 가리지 않게 · 2026-11-18) */}
            <span className={s.hitText}>
              {hits[0].split('\n').map((x, i) => <span key={i} className={i ? s.hitAmt : undefined}>{x}</span>)}
              {hits.length > 1 ? <span className={s.hitAmt}>외 {hits.length - 1}개</span> : null}
            </span>
          </span>
        ) : null}
      </span>
      <span className={s.body}>
        <span className={s.kindTag}>{p.sub || ' '}</span>
        <span className={s.name} title={p.name}>{p.name}</span>
        <span className={s.meta}>{brand || ' '}</span>
        {notes ? (
          <span className={s.notes}>
            {Object.entries(notes).map(([k, v]) => (
              <span key={k} data-k={k}>{v}</span>
            ))}
          </span>
        ) : null}
      </span>
      <span className={s.facts}>
        {facts.length ? (
          facts.map((f) => (
            <span key={f.label} className={s.fact} style={f.value != null && f.tone ? ({ ['--tone' as string]: `var(--band-${f.tone})` } as React.CSSProperties) : undefined}>
              <span className={s.factLabel}>{f.label}</span>
              {f.value === undefined ? (
                <span className={s.factWait} aria-label="받는 중" />
              ) : (
                <span
                  className={`${s.factValue} num ${f.value == null ? s.factNone : ''}`}
                  style={f.value != null && f.tone ? { color: `var(--band-${f.tone}-t)` } : undefined}
                >
                  {f.value ?? '—'}
                </span>
              )}
            </span>
          ))
        ) : (
          <span className={s.factNote}>{p.status === 'preparing' ? '판독 준비 중' : '평가 정보 없음'}</span>
        )}
      </span>
    </Link>
  );
}

/** 기다리는 카드 — 실제 카드와 같은 칸 높이. */
export function SkeletonCard() {
  return (
    <span className={s.skCard} aria-hidden>
      <span className={s.sk} style={{ height: 'var(--sk-media, 120px)' }} />
      <span className={s.sk} style={{ height: 16, width: '82%' }} />
      <span className={s.sk} style={{ height: 12, width: '54%' }} />
      <span className={s.sk} style={{ height: 66, marginTop: 6 }} />
    </span>
  );
}
