// 더 나은 선택 · 비슷한 상품 — 앱 ProductDetailScreen 의 RecCard + Track 과 같은 카드(2026-11-03 웹 리뉴얼).
//   ① 머리: 식품 그림(사진) · 배지(더 나음 / 비슷하게 좋음) · 제조사
//   ② 이름 두 줄까지
//   ③ 세 칸 띠: 영양 | 성분 | 당질 — 이 제품보다 나아진 축은 ↑(당질은 적어져 ↓)
//   ④ 바닥 한 줄: 핵심 차이(「당류 −11g/100ml」). 없으면 단점(주황) 또는 서버 사유 첫 줄 — 바닥이 비지 않는다.
// 휴대폰은 가로로 넘기고(카드 단위로 걸린다), 넓은 화면은 격자로 편다. 점수 · 등급은 내지 않는다.
import Link from 'next/link';
import { FoodTile, foodKind } from '../FoodTile';
import { brandName } from '../ProductRow';
import { Icon } from '../Icon';
import { cleanReason } from '@/lib/reason';
import { bandOf, toneOf } from '@/lib/bands';
import { AXIS_NAME, CARB_NONE, SHORT_WORD } from '@/lib/content/words';
import type { Alternative } from '@/lib/types';
import styles from './detail.module.css';
import { CompareChip } from '../p/Compare';


function Cell({ a, k, up }: { a: Alternative; k: 'nutrition' | 'ingredient' | 'glycemic'; up: boolean }) {
  const ax = a.axes?.[k];
  let value = '—';
  let color: string | undefined = 'var(--t3)';
  if (k === 'glycemic') {
    if (ax?.band === 'amount' && ax.carb_g != null) {
      value = `${ax.carb_g < 10 ? Math.round(ax.carb_g * 10) / 10 : Math.round(ax.carb_g)}g`;
      color = undefined;
    } else if (ax?.band === 'n/a') {
      value = CARB_NONE;
      color = undefined;
    }
  } else {
    const t = toneOf(k, ax);
    const b = bandOf(ax);
    if (b) {
      value = SHORT_WORD(b, k === 'nutrition' ? 'nutrition' : 'ingredient');
      color = t ? `var(--band-${t}-t)` : 'var(--t2)';
    }
  }
  return (
    <span className={styles.recCell}>
      <span className="t-micro c-t3">{AXIS_NAME[k]}</span>
      <span className={`t-caption ${styles.recValue}`} style={{ color }}>
        {up ? <Icon name="arrowUp" size={16} strokeWidth={2.4} className={k === 'glycemic' ? styles.down : styles.up} /> : null}
        {value}
      </span>
    </span>
  );
}

function RecCard({ a, note, warn = false }: { a: Alternative; note?: string; warn?: boolean }) {
  const lateral = a.kind === 'lateral';
  // 비슷한 상품(/similar)은 대안이 아니라 improves 가 없다 — 그대로 읽으면 상세 화면 전체가 죽는다(2026-11-06).
  const improves = a.improves ?? [];
  const badge = lateral ? '비슷하게 좋음' : improves.length > 0 ? '더 나음' : null;
  const lines = cleanReason(a.reason ?? '', a.tradeoff ?? '').split('\n').filter(Boolean);
  const facts = lines.slice(1);
  const foot = note || (facts[0] ?? (a.tradeoff || lines[0] || (lateral ? '비슷하게 좋은 선택' : '더 나은 선택')));
  const footWarn = warn || (!note && !facts[0] && !!a.tradeoff);
  const ups = new Set(improves);
  return (
    <li className={styles.recItem}>
      <Link href={`/p/${a.id}`} className={styles.rec}>
        <span className={styles.recMedia} style={{ background: `var(--tile-${foodKind(a.sub)}-bg)` }}>
          <FoodTile type={a.sub} src={a.image_url} size={88} />
          <span className={`${styles.recBadge} ${badge && !lateral ? styles.badgeOn : ''}`} style={{ visibility: badge ? 'visible' : 'hidden' }}>{badge ?? '\u00a0'}</span>
        </span>
        <span className={styles.recBody}>
          <span className={`t-caption c-t3 ${styles.ellipsis}`}>{brandName(a.brand) || a.sub || '\u00a0'}</span>
          <span className={`t-strong ${styles.recName}`}>{a.name}</span>
        </span>
        <span className={styles.recStrip}>
          <Cell a={a} k="nutrition" up={ups.has('nutrition')} />
          <span className={styles.recRule} aria-hidden />
          <Cell a={a} k="ingredient" up={ups.has('ingredient')} />
          <span className={styles.recRule} aria-hidden />
          <Cell a={a} k="glycemic" up={ups.has('glycemic')} />
        </span>
        <span className={`t-caption ${styles.recFoot} ${footWarn ? styles.warn : 'c-t2'}`}>{foot}</span>
      </Link>
      {/* 이 제품과 나란히 — 상세 화면(비교 창이 있는 곳)에서만 보인다 */}
      <CompareChip id={a.id} name={a.name} />
    </li>
  );
}

/** `noteOf` — 목적별로 줄 세웠을 때 바닥 한 줄을 그 기준 값으로(「100mL당 0kcal」). */
export function AltTrack({ items, label, noteOf, warnOf }: { items: Alternative[]; label: string; noteOf?: (a: Alternative) => string; warnOf?: (a: Alternative) => boolean }) {
  return (
    <ul className={styles.track} aria-label={label}>
      {items.map((a) => <RecCard key={a.id} a={a} note={noteOf?.(a)} warn={warnOf?.(a)} />)}
    </ul>
  );
}
