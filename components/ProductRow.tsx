// 제품 목록 한 줄 — 앱 components/ProductRow 와 같은 짜임(2026-11-03 웹 리뉴얼):
//   타일(사진이 있으면 사진) | 이름(두 줄까지) · 제조사, 식품유형(한 줄) · 세 축 한 줄(영양 | 성분 | 당질)
// 이름이 세 축 아이콘에 밀려 「HomeplusSig…」로 잘리던 것을 고쳤다 — 세 축은 이름 아래 한 줄로 내려 이름이 폭을 다 쓴다.
// 뜻 검색이 영양 수식어로 줄 세웠으면(「당이 낮은 아이스크림」) 그 값(metric · 「당류 2g/100g」)을 오른쪽 위에 붙인다.
import Link from 'next/link';
import { FoodTile } from './FoodTile';
import { AxisStrip } from './axis/AxisStrip';
import type { ProductSummary } from '@/lib/types';
import styles from './ProductRow.module.css';

export function brandName(brand?: string | null): string {
  // 제조사 칸에 주소 · 공장명이 붙어 온다(「코카-콜라㈜_충남 천안시 …」 · 「F7(6931):씨에이…」) — 첫 조각만.
  return (brand ?? '').split(/[/_]|\s{2,}/)[0].replace(/^F\d+\(\d+\):/, '').trim();
}

export function ProductRow({ p, metric, rank }: { p: ProductSummary; metric?: string | null; rank?: number }) {
  const sub = [brandName(p.brand), p.sub].filter(Boolean).join(', ');
  return (
    <li>
      <Link href={`/p/${p.id}`} className={styles.row}>
        <FoodTile type={p.sub} src={p.image_url} size={56} />
        <span className={styles.text}>
          <span className={`t-strong ${styles.name}`}>{p.name}</span>
          {sub ? <span className={`t-caption c-t3 ${styles.meta}`}>{sub}</span> : null}
          {metric ? <span className={`t-caption ${styles.metric}`}>{metric}</span> : null}
        </span>
        {/* 세 축 한 줄은 타일 아래까지 행 폭 전체 — 이름 칸 안에 두면 좁은 화면에서 「탄수화물 1…」로 잘렸다.
            세 축이 안 실려 오는 목록(많이 찾는 제품)도 있다 — 「준비 중」은 서버가 그렇다고 할 때만 */}
        {p.axes ? (
          <AxisStrip axes={p.axes} className={styles.strip} />
        ) : p.status === 'preparing' ? (
          <span className={`t-caption c-t3 ${styles.strip} ${styles.stripNote}`}>판독 준비 중</span>
        ) : null}
        {rank ? <span className={styles.rank} aria-hidden>{rank}</span> : null}
      </Link>
    </li>
  );
}

export function ProductList({ items, metrics, grid = false, ranked = false }: { items: ProductSummary[]; metrics?: (string | null | undefined)[]; grid?: boolean; ranked?: boolean }) {
  return (
    <ul className={`${styles.list} ${grid ? styles.grid2 : ''}`}>
      {items.map((p, i) => <ProductRow key={p.id} p={p} metric={metrics?.[i]} rank={ranked ? i + 1 : undefined} />)}
    </ul>
  );
}
