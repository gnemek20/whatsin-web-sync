// 제품 목록 한 줄 — 앱 components/ProductRow 와 같은 짜임(2026-11-03 웹 리뉴얼):
//   타일(사진이 있으면 사진) | 이름(두 줄까지) · 제조사, 식품유형(한 줄) · 세 축 한 줄(영양 | 성분 | 당질)
// 이름이 세 축 아이콘에 밀려 「HomeplusSig…」로 잘리던 것을 고쳤다 — 세 축은 이름 아래 한 줄로 내려 이름이 폭을 다 쓴다.
// 뜻 검색이 영양 수식어로 줄 세웠으면(「당이 낮은 아이스크림」) 그 값(metric · 「당류 2g/100g」)을 오른쪽 위에 붙인다.
import Link from 'next/link';
import { FoodTile } from './FoodTile';
import { AxisStrip } from './axis/AxisStrip';
import type { ProductSummary } from '@/lib/types';
import type { LensRow } from '@/lib/facts';
import styles from './ProductRow.module.css';

export function brandName(brand?: string | null): string {
  // 제조사 칸에 주소 · 공장명이 붙어 온다(「코카-콜라㈜_충남 천안시 …」 · 「F7(6931):씨에이…」) — 첫 조각만.
  return (brand ?? '').split(/[/_]|\s{2,}/)[0].replace(/^F\d+\(\d+\):/, '').trim();
}

// 2026-11-13 — 내 기준이 있으면 세 축 한 줄 대신 내 기준 숫자(100g(mL)당)와 「○○ 들어 있음」을 붙인다(lib/facts.lensRow).
// 세 축은 상세 맨 아래 「자세한 평가」로 내려갔다.
// 순위 숫자는 목록(ul)의 CSS 카운터가 매긴다(.ranked) — 순서를 바꾸면 숫자도 따라온다(components/search/SortableResults).
// notes — 정렬 기준별 바닥 한 줄({rel: …, diet: '100g당 380kcal', …}). 전부 그려 두고 목록의 data-sort 로 하나만 보인다(카드 높이 고정).
export function ProductRow({ p, metric, lens, notes }: { p: ProductSummary; metric?: string | null; lens?: LensRow | null; notes?: Record<string, string> }) {
  const sub = [brandName(p.brand), p.sub].filter(Boolean).join(', ');
  return (
    <li className={styles.item}>
      <Link href={`/p/${p.id}`} className={styles.row}>
        <FoodTile type={p.sub} src={p.image_url} size={64} />
        <span className={styles.text}>
          <span className={`t-strong ${styles.name}`}>{p.name}</span>
          {sub ? <span className={`t-caption c-t3 ${styles.meta}`}>{sub}</span> : null}
          {notes ? (
            <span className={`t-caption ${styles.notes}`}>
              {Object.entries(notes).map(([k, v]) => (
                <span key={k} data-k={k}>{v || '\u00a0'}</span>
              ))}
            </span>
          ) : metric ? (
            <span className={`t-caption ${styles.metric}`}>{metric}</span>
          ) : null}
        </span>
        {/* 세 축 한 줄은 타일 아래까지 행 폭 전체 — 이름 칸 안에 두면 좁은 화면에서 「탄수화물 1…」로 잘렸다.
            세 축이 안 실려 오는 목록(많이 찾는 제품)도 있다 — 「준비 중」은 서버가 그렇다고 할 때만 */}
        {lens ? (
          <span className={`${styles.strip} ${styles.lens} `}>
            {lens.hits.map((h) => (
              <span key={h} className={styles.hit}>{h} 들어 있음</span>
            ))}
            {lens.nums.map((n) => (
              <span key={n.key} className={styles.num}>
                <span className={styles.numLabel}>{n.label}</span>
                <span className={`num ${n.has ? '' : 'c-t3'}`}>{n.text}</span>
              </span>
            ))}
          </span>
        ) : p.axes ? (
          <AxisStrip axes={p.axes} className={`${styles.strip} `} />
        ) : p.status === 'preparing' ? (
          <span className={`t-caption c-t3 ${styles.strip} ${styles.stripNote}`}>판독 준비 중</span>
        ) : null}
      </Link>
    </li>
  );
}

export function ProductList({ items, metrics, grid = false, ranked = false, lens }: { items: ProductSummary[]; metrics?: (string | null | undefined)[]; grid?: boolean; ranked?: boolean; lens?: (LensRow | null)[] }) {
  return (
    <ul className={`${styles.list} ${grid ? styles.grid2 : ''} ${ranked ? styles.ranked : ''}`}>
      {items.map((p, i) => <ProductRow key={p.id} p={p} metric={metrics?.[i]} lens={lens?.[i]} />)}
    </ul>
  );
}
