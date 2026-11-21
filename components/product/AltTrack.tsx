// 더 나은 선택 · 비슷한 상품 — 앱 ProductDetailScreen 의 RecCard + Track 과 같은 카드(2026-11-03 웹 리뉴얼).
//   ① 머리: 식품 그림(사진) · 배지(더 나음 / 비슷하게 좋음) · 제조사
//   ② 이름 두 줄까지
//   ③ 세 칸 띠: 영양 | 성분 | 당질 — 이 제품보다 나아진 축은 ↑(당질은 적어져 ↓)
//   ④ 바닥 칩: 이 제품과의 핵심 차이 — 「이 제품보다 · 당류 11.8g 적음 · 100g당」(2026-11-17 사용자 「뭐가 기준인지 모르겠다 · 미니멀한 칩」).
//     서버 사유 줄(「당류 −11.8g/100g」 · 「1회분 당질 31g→18.6g」)을 읽기 쉬운 말로 바꾼다. 기준 탭의 값(「100g당 210kcal」)은 그대로 칩 하나.
//     없으면 단점(주황 칩) 또는 서버 사유 첫 줄 — 바닥이 비지 않는다.
// 휴대폰은 가로로 넘기고(카드 단위로 걸린다), 넓은 화면은 격자로 편다. 점수 · 등급은 내지 않는다.
import Link from 'next/link';
import { Fragment } from 'react';
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

/** 서버 사유 한 줄 → 칩 글 · 기준(작은 글). 모르는 꼴이면 그대로. */
function diffOf(line: string): { text: string; per?: string; better?: boolean } {
  const t = line.trim();
  // 「당류 −11.8g/100g」 · 「나트륨 -170mg/100ml」
  let m = t.match(/^(.+?)\s*[−-]\s*([\d.,]+)\s*(g|mg|kcal)\s*\/\s*100\s*(g|ml|mL)$/);
  if (m) return { text: `${m[1]} ${m[2]}${m[3]} 적음`, per: `${m[4] === 'g' ? '100g' : '100mL'}당`, better: true };
  m = t.match(/^(.+?)\s*\+\s*([\d.,]+)\s*(g|mg|kcal)\s*\/\s*100\s*(g|ml|mL)$/);
  if (m) return { text: `${m[1]} ${m[2]}${m[3]} 많음`, per: `${m[4] === 'g' ? '100g' : '100mL'}당`, better: /단백질|식이섬유/.test(m[1]) };
  // 「1회분 당질 31g→18.6g」
  m = t.match(/^(.+?)\s+([\d.,]+)\s*(g|mg|kcal)?\s*→\s*([\d.,]+)\s*(g|mg|kcal)$/);
  if (m) return { text: `${m[1]} ${m[2]}→${m[4]}${m[5]}`, better: parseFloat(m[4]) < parseFloat(m[2]) };
  return { text: t };
}

type Foot = { lead: string; text: string; tone: 'warn' | 'good' } | null;
type LensCell = { label: string; text: string };

function RecCard({ a, idx, note, warn = false, foot: lensFoot, cells, ev, tab, base }: { a: Alternative; idx: number; note?: string; warn?: boolean; foot?: Foot; cells?: LensCell[] | null; ev: 'alt_click' | 'similar_click'; tab?: string; base?: string }) {
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
    <li className={styles.recItem} data-i={idx}>
      {/* 행동 기록 — 누르면 몇 번째 카드 · 어느 기준 탭에서 눌렀는지(lib/track · 몇 번째는 li[data-i]) */}
      <Link href={`/p/${a.id}`} className={styles.rec} data-ev={ev} data-tid={a.id} data-pid={base} data-tab={tab}>
        <span className={styles.recMedia} style={{ background: `var(--tile-${foodKind(a.sub)}-bg)` }}>
          <FoodTile type={a.sub} src={a.image_url} size={88} />
          <span className={`${styles.recBadge} ${badge && !lateral ? styles.badgeOn : ''}`} style={{ visibility: badge ? 'visible' : 'hidden' }}>{badge ?? '\u00a0'}</span>
        </span>
        <span className={styles.recBody}>
          <span className={`t-caption c-t3 ${styles.ellipsis}`}>{brandName(a.brand) || a.sub || '\u00a0'}</span>
          <span className={`t-strong ${styles.recName}`} title={a.name}>{a.name}</span>
        </span>
        {cells && cells.length ? (
          // 내 기준 탭 — 세 축 대신 내가 고른 영양소(100g(mL)당)
          <span className={styles.recStrip}>
            {cells.map((c, i) => (
              <Fragment key={c.label}>
                {i ? <span className={styles.recRule} aria-hidden /> : null}
                <span className={styles.recCell}>
                  <span className="t-micro c-t3">{c.label}</span>
                  <span className={`t-caption ${styles.recValue}`} style={c.text === '—' ? { color: 'var(--t3)' } : undefined}>{c.text}</span>
                </span>
              </Fragment>
            ))}
          </span>
        ) : (
          <span className={styles.recStrip}>
            <Cell a={a} k="nutrition" up={ups.has('nutrition')} />
            <span className={styles.recRule} aria-hidden />
            <Cell a={a} k="ingredient" up={ups.has('ingredient')} />
            <span className={styles.recRule} aria-hidden />
            <Cell a={a} k="glycemic" up={ups.has('glycemic')} />
          </span>
        )}
        {lensFoot ? (
          // 내 기준 탭의 바닥 — 피할 성분이 무엇이 얼마나(「에리스리톨, 당알코올 합계 40g」) 또는 「피할 성분 없음」
          <span className={`${styles.recFoot} ${styles.recFootDiff}`}>
            <span className={styles.recLead}>{lensFoot.lead}</span>
            <span className={`${styles.recChip} ${styles.recChipWrap} ${lensFoot.tone === 'warn' ? styles.recChipWarn : styles.recChipGood}`}>{lensFoot.text}</span>
          </span>
        ) : note ? (
          // 기준 탭의 값 — 그 제품의 숫자(비교가 아니다)
          <span className={styles.recFoot}>
            <span className={`${styles.recChip} ${footWarn ? styles.recChipWarn : ''}`}>{foot}</span>
          </span>
        ) : footWarn || !facts[0] ? (
          <span className={styles.recFoot}>
            <span className={`${styles.recChip} ${footWarn ? styles.recChipWarn : ''}`}>{foot}</span>
          </span>
        ) : (
          (() => {
            const d = diffOf(foot);
            return (
              <span className={`${styles.recFoot} ${styles.recFootDiff}`}>
                {/* 기준을 칩 위 작은 글로 — 칩은 좁은 칸에서도 잘리지 않게 차이만 */}
                <span className={styles.recLead}>{d.per ? `${d.per}, 이 제품보다` : '이 제품보다'}</span>
                <span className={`${styles.recChip} ${d.better ? styles.recChipGood : ''}`}>{d.text}</span>
              </span>
            );
          })()
        )}
      </Link>
      {/* 이 제품과 나란히 — 상세 화면(비교 창이 있는 곳)에서만 보인다 */}
      <CompareChip id={a.id} name={a.name} />
    </li>
  );
}

/** `noteOf` — 목적별로 줄 세웠을 때 바닥 한 줄을 그 기준 값으로(「100mL당 0kcal」). */
export function AltTrack({ items, label, noteOf, warnOf, footOf, cellsOf, ev = 'similar_click', tab, base }: { items: Alternative[]; label: string; noteOf?: (a: Alternative) => string; warnOf?: (a: Alternative) => boolean; footOf?: (a: Alternative) => Foot; cellsOf?: (a: Alternative) => LensCell[] | null; ev?: 'alt_click' | 'similar_click'; tab?: string; base?: string }) {
  return (
    <ul className={styles.track} aria-label={label}>
      {items.map((a, i) => <RecCard key={a.id} idx={i} a={a} note={noteOf?.(a)} warn={warnOf?.(a)} foot={footOf?.(a)} cells={cellsOf?.(a)} ev={ev} tab={tab} base={base} />)}
    </ul>
  );
}
