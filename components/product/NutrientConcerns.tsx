// 영양 칸을 펼쳤을 때 — 감점이 큰 영양소마다 「얼마나 · 섭취 시 · 주의 대상」(2026-11-06 사용자 「영양도 성분처럼 섭취했을 때의 문제점」).
// 주의 성분 목록(ConcernList)과 같은 생김새 · 같은 클래스. 고르는 규칙은 판정 근거 줄(nutritionView)과 같은 worstParts(감점 큰 둘)라
// 두 곳이 다른 영양소를 말하지 않는다. 문구는 packages/data/nutrition/nutrients.json `intake` · `intake_copy` — 여기서 만들지 않는다.
import { Icon } from '../Icon';
import { Rich } from '@/components/Rich';
import { worstPartsOf } from '@/lib/axes';
import { INTAKE_COPY, NUTRIENTS, NUTRIENTS_BASIS, partNutrient, unitText } from '@/lib/content/nutrients';
import { fill } from '@/lib/content/text';
import type { ScorePart } from '@/lib/types';
import styles from './product.module.css';

/** 근거 줄의 값 「18.0g」 · 「507kcal」 · 「133mg」 → 수와 단위. 비율(「62%」) 같은 다른 꼴이면 null(양을 말하지 않는다). */
function parseValue(v: string): { n: number; unit: string } | null {
  const m = /^([\d.,]+)\s*(g|mg|kcal)$/.exec(v.trim());
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ''));
  return Number.isFinite(n) ? { n, unit: m[2] } : null;
}

/** 펼친 칸에 설명할 영양소 — 판정 근거 줄과 같은 둘 중 섭취 시 문구가 있는 것. 없으면 칸을 펼치지 않는다(「모두 기준 아래」 같은 빈말을 내지 않는다). */
export const intakeParts = (parts?: ScorePart[] | null) => worstPartsOf(parts).filter((p) => NUTRIENTS[partNutrient(p.key, p.label) ?? '']?.intake);

const round = (n: number) => (n >= 100 ? Math.round(n).toLocaleString('ko-KR') : n >= 10 ? n.toFixed(0) : n.toFixed(1).replace(/\.0$/, ''));

export function NutrientConcerns({
  parts,
  tone,
  basis,
  basisG,
  unit,
  cards = false,
}: {
  parts?: ScorePart[] | null;
  tone: number | null;
  basis?: 'serving' | 'total_content' | null;
  basisG?: number | null;
  unit?: string | null;
  cards?: boolean;
}) {
  const worst = intakeParts(parts);
  if (!worst.length) return null;
  const u = unitText(unit);
  return (
    <>
      <ul className={`${styles.concerns} ${cards ? styles.concernCards : ''}`}>
        {worst.map((p) => {
          const k = partNutrient(p.key, p.label)!;
          const it = NUTRIENTS[k];
          const ik = it.intake!;
          const v = parseValue(p.value);
          const inBasis =
            v && basis && basisG && basisG > 0 && it.daily
              ? fill(INTAKE_COPY.in_basis, {
                  head: NUTRIENTS_BASIS[basis],
                  g: round(basisG),
                  unit: u,
                  amount: `**${round((v.n * basisG) / 100)}${v.unit}**`,
                  pct: Math.round(((v.n * basisG) / 100 / it.daily) * 100),
                })
              : null;
          return (
            <li key={p.key ?? p.label} className={styles.concern}>
              <Icon name="apple" size={20} className={styles.concernIcon} style={tone ? { color: `var(--band-${tone})` } : undefined} aria-hidden />
              <div className={styles.concernText}>
                <div className={styles.concernTitle}>
                  <span className="t-strong">{p.label}</span>
                  <span className={`t-micro ${styles.tag}`}>{ik.tag}</span>
                </div>
                <span className="t-caption c-t2">
                  <Rich text={[v ? fill(INTAKE_COPY.per100, { unit: u, value: p.value }) : p.value, inBasis].filter(Boolean).join(', ')} />
                </span>
                <dl className={styles.facts3}>
                  <dt className="t-caption c-t3">섭취 시</dt>
                  <dd className="t-body"><Rich text={ik.effect} /></dd>
                  <dt className="t-caption c-t3">주의 대상</dt>
                  <dd className="t-body c-t2"><Rich text={ik.who} /></dd>
                </dl>
                <span className="t-caption c-t3">{ik.source}</span>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="t-caption c-t3">{INTAKE_COPY.hint}</p>
    </>
  );
}
