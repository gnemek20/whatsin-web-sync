'use client';
// 상세 맨 위 「내 기준」(2026-11-14 개편) — 답이 먼저다.
//   ① 들었나 — 큰 문장 한 줄(「피할 성분 1개가 들어 있습니다」 / 「피할 성분은 원재료 목록에 없습니다」) + 성분마다 한 줄
//   ② 얼마나 — 먼저 볼 숫자 최대 3개를 큰 숫자 줄로(칸 사이 가는 선) · 1회분 / 100g(mL)당 바꾸기
//   ③ 그 밖의 영양 — 이름 · 값 짝
// 「많다 · 적다」 판정은 하지 않는다 — 공표 1일 기준치 대비 %만 사실로 붙인다.
// 레이아웃 고정 — 기준을 바꿔도 줄 수가 같다(다른 기준 값 줄 · 기준치 줄을 늘 둔다).
import { useState } from 'react';
import type { ProductDetail } from '@/lib/types';
import { GOALS, NUTRIENTS, type Lens } from '@/lib/lens';
import { amountOf, avoidCheck, basisOf, otherNutrients, per100Label, type Mode } from '@/lib/facts';
import { useLens } from '../lens/LensProvider';
import { Icon } from '../Icon';
import s from './p.module.css';

export function MyLens({ p, lens }: { p: ProductDetail; lens: Lens }) {
  const { openEditor } = useLens();
  const basis = basisOf(p);
  const [mode, setMode] = useState<Mode>(basis.kind === 'per100' ? 'per100' : 'serving');
  const check = avoidCheck(p, lens.avoid);
  const explain = lens.level !== 'own';
  const noNutrition = !p.nutrition.per100 && !p.nutrition.kcal;
  const hits = check.results.filter((r) => r.hits.length);
  const goals = lens.goals.map((g) => GOALS.find((x) => x.id === g)?.label).filter(Boolean) as string[];

  // ① 답 문장 — 상태 하나만 고른다
  let tone: 'hit' | 'clear' | 'none' = 'none';
  let answer = '';
  if (lens.avoid.length === 0) answer = '피할 성분을 아직 정하지 않았습니다';
  else if (check.noIngredients) answer = '원재료 정보가 없어 확인할 수 없습니다';
  else if (hits.length) {
    tone = 'hit';
    answer = `피할 성분 ${hits.length}개가 들어 있습니다`;
  } else {
    tone = 'clear';
    answer = lens.avoid.length === 1 ? `${lens.avoid[0].l}, 원재료 목록에 없습니다` : `피할 성분 ${lens.avoid.length}개 모두 원재료 목록에 없습니다`;
  }

  return (
    <section className={`${s.lens} ${tone === 'hit' ? s.lensHit : tone === 'clear' ? s.lensClear : ''}`} aria-labelledby="lens-h">
      <header className={s.lensHead}>
        <div className={s.lensHeadText}>
          <h2 id="lens-h" className={s.lensKicker}>
            <Icon name="sliders" size={16} />
            내 기준으로 보면
          </h2>
          <span className={s.lensGoals}>{goals.length ? goals.join(', ') : ' '}</span>
        </div>
        <button type="button" className={s.edit} onClick={() => openEditor()}>
          <Icon name="edit" size={16} />
          고치기
        </button>
      </header>

      {/* ① 들었나 */}
      <div className={s.answer}>
        <p className={s.answerLine}>
          <span className={s.answerIcon} aria-hidden>
            <Icon name={tone === 'hit' ? 'info' : tone === 'clear' ? 'check' : 'search'} size={20} strokeWidth={2.2} />
          </span>
          <span>{answer}</span>
        </p>
        {lens.avoid.length === 0 ? (
          <button type="button" className={`btn btn-primary btn-sm ${s.answerCta}`} onClick={() => openEditor(4)}>
            피할 성분 정하기
          </button>
        ) : !check.noIngredients ? (
          <ul className={s.avoidList}>
            {check.results.map((r) => (
              <li key={r.item.k} className={`${s.avoidRow} ${r.hits.length ? s.avoidHit : ''}`}>
                <span className={s.avoidName}>{r.item.l}</span>
                {r.hits.length ? (
                  <span className={s.avoidWhere}>
                    <span className={s.avoidPill}>들어 있음</span>
                    <span className={s.avoidPos}>
                      {r.hits.map((h) => `${h.ing.name}${h.ing.found_in ? `(${h.ing.found_in} 안)` : ''}, ${h.pos}번째`).join(' / ')}
                    </span>
                  </span>
                ) : (
                  <span className={s.avoidNone}>
                    <Icon name="check" size={16} strokeWidth={2.2} />
                    목록에 없음
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : null}
        {/* 「원재료 N개 중 M개는 세부 구성을 확인하지 못해…」 꼬리 줄은 뺐다(2026-11-14 사용자) — 회피 결과 옆에서 군더더기였다. */}
      </div>

      {/* ② 얼마나 */}
      <div className={s.amount}>
        <div className={s.amountHead}>
          <h3 className={s.amountTitle}>먼저 볼 숫자</h3>
          {basis.kind !== 'per100' && !noNutrition ? (
            <div className={s.seg} role="group" aria-label="기준 바꾸기">
              <button type="button" aria-pressed={mode === 'serving'} onClick={() => setMode('serving')}>{basis.label}</button>
              <button type="button" aria-pressed={mode === 'per100'} onClick={() => setMode('per100')}>{per100Label(basis)}</button>
            </div>
          ) : (
            <span className={s.basisTag}>{basis.label}</span>
          )}
        </div>
        {noNutrition ? (
          <p className="t-body c-t2">이 제품은 영양성분 자료가 없습니다.</p>
        ) : (
          <>
            <ul className={s.stats} data-n={lens.focus.length}>
              {lens.focus.map((k, i) => {
                const a = amountOf(p, k, mode);
                const sv = amountOf(p, k, 'serving');
                const other =
                  basis.kind === 'per100' ? ' '
                    : mode === 'serving' ? (a.per100Text ? `${per100Label(basis)} ${a.per100Text}` : ' ')
                      : sv.value != null ? `${basis.label} ${sv.text}` : ' ';
                const pct = a.dailyPct != null ? Math.round(a.dailyPct) : null;
                return (
                  <li key={k} className={s.stat}>
                    <span className={s.statLabel}>
                      <span className={`${s.statIdx} num`}>{i + 1}</span>
                      {a.label}
                    </span>
                    {a.value != null ? (
                      <span className={s.statValue}>
                        <span className="t-num-xl">{a.numText}</span>
                        <span className={s.statUnit}>{a.unit}</span>
                      </span>
                    ) : (
                      <span className={s.statMissing}>{a.missing}</span>
                    )}
                    <span className={`${s.statMeta} num`}>{other}</span>
                    <span className={s.statDv}>
                      <span className={s.statBar} aria-hidden>
                        <span style={{ width: `${Math.min(100, pct ?? 0)}%` }} />
                      </span>
                      <span className="num">{pct != null ? `하루 기준치의 ${pct}%` : '하루 기준치 없음'}</span>
                    </span>
                    {explain ? <span className={s.statDesc}>{NUTRIENTS[k].desc}</span> : null}
                  </li>
                );
              })}
            </ul>
            <dl className={s.others}>
              <dt>그 밖의 영양</dt>
              {otherNutrients(lens.focus)
                .map((k) => amountOf(p, k, mode))
                .filter((a) => a.value != null)
                .map((a) => (
                  <dd key={a.label}>
                    <span className="c-t2">{a.label}</span>
                    <span className="num">{a.text}</span>
                  </dd>
                ))}
            </dl>
          </>
        )}
      </div>
    </section>
  );
}
