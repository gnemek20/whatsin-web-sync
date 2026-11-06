// 주의 성분(flagged) · 원재료 칩 · 가공육 안내.
// 원재료 판정은 점이 아니라 글자색·칩 틴트로(DESIGN_RULES §0-7 · 상태 점 금지): risk·caution·good 만 판정색,
// ok 는 중립, unknown 은 흐린 글자 + 점선 테두리(「모른다」는 경고가 아니다).
// 걸린 것이 없다고 「알레르기 없음」「비건」 같은 말을 만들지 않는다 — 원재료 상당수가 복합원료라 「없다」를 보장할 수 없다.
import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { Icon } from '../Icon';
import { VERDICT_LABEL, verdictTone } from '@/lib/axes';
import type { Ingredient, IngredientVerdict, ProcessedMeatNotice } from '@/lib/types';
import styles from './product.module.css';
import { Rich } from '@/components/Rich';

/** 칩·태그에 입히는 판정 틴트 — 글자는 판정 글자색, 테두리·바탕은 같은 색을 옅게. */
export function verdictStyle(v: IngredientVerdict): CSSProperties | undefined {
  const tone = verdictTone(v);
  if (tone) {
    return {
      color: `var(--band-${tone}-t)`,
      borderColor: `color-mix(in srgb, var(--band-${tone}) 45%, transparent)`,
      background: `color-mix(in srgb, var(--band-${tone}) 8%, var(--surface))`,
    };
  }
  if (v === 'unknown') return { color: 'var(--t3)', borderStyle: 'dashed' };
  return undefined;
}

/** 판정 이름표 — 점 없이 틴트한 알약 하나. */
export function VerdictTag({ v, children, className }: { v: IngredientVerdict; children?: ReactNode; className?: string }) {
  return (
    <span className={`${styles.vtag} ${className ?? ''}`} style={verdictStyle(v)}>
      {children ?? VERDICT_LABEL[v]}
    </span>
  );
}

const ingHref = (name: string) => `/i/${encodeURIComponent(name)}`;

// 주의 성분 — 성분마다 「성분 정보 / 섭취 시 / 주의 대상 / 대안 제품」(11-05 「무엇 / 먹으면 / 누가 / 대신」에서 바꿈)을 펼친 채로(2026-11-03 사용자 「왜 주의인지 아무 데도 없다」).
// 이름만 보이면 성분표 보는 서비스가 된다 — 세 축 바로 아래에서 영향까지 읽히게 한다. 출처 · 긴 설명은 성분 페이지(자세히).
// 글은 서버(성분 사전 info) 그대로 — 여기서 만들지 않는다.
export function Concerns({ items }: { items: Ingredient[] }) {
  if (items.length === 0) return null;
  return (
    <section className={`card ${styles.block}`} aria-labelledby="concern-h">
      <div className={styles.blockHead}>
        <h2 id="concern-h" className="t-headline">주의 성분</h2>
        <span className="t-caption c-t2">{items.length}종</span>
      </div>
      <ConcernList items={items} />
    </section>
  );
}

/** 주의 성분 목록만 — 상세 맨 위 성분 칸을 펼치면 이 목록이 열린다(2026-11-06 사용자 「상단 세 축을 탭하면 아코디언으로」). */
export function ConcernList({ items }: { items: Ingredient[] }) {
  return (
      <ul className={styles.concerns}>
        {items.map((it, i) => {
          const cs = (it.info?.concerns ?? []).filter((c) => c.type !== 'safe' && c.type !== 'info');
          const effect = cs.map((c) => c.note).filter(Boolean).join('\n');
          const who = it.info?.advice || '';
          const tone = verdictTone(it.verdict);
          return (
            <li key={`${it.key}-${i}`} className={styles.concern}>
              <Icon
                name="flask"
                size={20}
                className={styles.concernIcon}
                style={tone ? { color: `var(--band-${tone})` } : undefined}
                aria-hidden
              />
              <div className={styles.concernText}>
                <div className={styles.concernTitle}>
                  <span className="t-strong">{it.name}</span>
                  {cs.map((c) => (
                    <span key={c.label} className={`t-micro ${styles.tag}`} style={tone ? verdictStyle(it.verdict) : undefined}>{c.label}</span>
                  ))}
                </div>
                {it.found_in ? <span className="t-caption c-t3">「{it.found_in}」 안</span> : null}
                <dl className={styles.facts3}>
                  <dt className="t-caption c-t3">성분 정보</dt>
                  <dd className="t-body c-t2"><Rich text={it.plain} /></dd>
                  {effect ? (
                    <>
                      <dt className="t-caption c-t3">섭취 시</dt>
                      <dd className="t-body"><Rich text={effect} /></dd>
                    </>
                  ) : null}
                  {who ? (
                    <>
                      <dt className="t-caption c-t3">주의 대상</dt>
                      <dd className="t-body c-t2"><Rich text={who} /></dd>
                    </>
                  ) : null}
                  {it.instead ? (
                    <>
                      <dt className="t-caption c-t3">대안 제품</dt>
                      <dd className="t-body c-t2"><Rich text={it.instead} /></dd>
                    </>
                  ) : null}
                </dl>
                <Link href={ingHref(it.name)} className={`t-caption c-t3 ${styles.more}`}>
                  근거와 출처
                  <Icon name="next" size={16} />
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
  );
}

export function IngredientChips({ items }: { items: Ingredient[] }) {
  // 같은 원재료가 두 번 적힌 라벨이 있다(복합조미식품 ×2) — 칩은 한 번만.
  const seen = new Set<string>();
  const list = items.filter((it) => (seen.has(it.key) ? false : (seen.add(it.key), true)));
  if (list.length === 0) return null;
  // 범례는 타일에 색 · 점선이 있는 것만(일반 원재료 · 첨가물은 평범한 타일이다)
  const present = (['risk', 'caution', 'unknown'] as IngredientVerdict[]).filter((v) =>
    list.some((it) => it.verdict === v),
  );
  return (
    <section className={`card ${styles.block}`} aria-labelledby="ing-h">
      <div className={styles.blockHead}>
        <h2 id="ing-h" className="t-headline">원재료</h2>
        <span className="t-caption c-t2">라벨 순서대로 {list.length}종</span>
      </div>
      <ul className={`${styles.chips} ${list.length === 1 ? styles.chipsOne : ''} ${list.length > 12 ? styles.chipsScroll : ''}`}>
        {list.map((it) => {
          const tone = it.verdict === 'risk' || it.verdict === 'caution' ? verdictTone(it.verdict) : null;
          const sub = [it.tag, it.percent != null ? `${it.percent}%` : null].filter(Boolean).join(' ');
          return (
            <li key={it.key}>
              <Link href={ingHref(it.name)} className={`${styles.chip} ${it.verdict === 'unknown' ? styles.chipUnknown : ''}`} title={it.plain}>
                <span className="t-body" style={tone ? { color: `var(--band-${tone}-t)` } : it.verdict === 'unknown' ? { color: 'var(--t2)' } : undefined}>
                  {it.name}
                </span>
                {sub ? <span className="t-caption c-t3">{sub}</span> : null}
                <span className="visually-hidden">{`, ${VERDICT_LABEL[it.verdict]}`}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      {present.length > 0 ? <ul className={styles.legend} aria-label="색의 뜻">
        {present.map((v) => (
          <li key={v}>
            <VerdictTag v={v} className="t-caption" />
          </li>
        ))}
      </ul> : null}
    </section>
  );
}

export function ProcessedMeat({ n }: { n: ProcessedMeatNotice }) {
  return (
    <aside className={styles.meat} aria-labelledby="meat-h">
      <span id="meat-h" className="t-micro c-t2">{n.label}</span>
      <p className="t-strong">{n.summary}</p>
      <p className="t-body c-t2">{n.detail}</p>
      <p className="t-caption c-t3">{n.source}</p>
    </aside>
  );
}
