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
import { amountOf, avoidCheck, basisOf, hitAmount, otherNutrients, per100Label, type Mode } from '@/lib/facts';
import { useLens } from '../lens/LensProvider';
import { Icon } from '../Icon';
import { GridPeek } from '../ui/GridPeek';
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
  else if (check.noIngredients) answer = '원재료 정보가 없어 확인 못 했습니다';
  else if (hits.length) {
    tone = 'hit';
    answer = `피할 성분 ${hits.length}개가 들어 있습니다`;
  } else {
    tone = 'clear';
    // 높이 고정 판의 한 줄 — 좁은 화면에서도 잘리지 않게 짧게(무엇이 없는지는 아래 칩)
    answer = lens.avoid.length === 1 ? `${lens.avoid[0].l}, 들어 있지 않습니다` : `피할 성분 ${lens.avoid.length}개 모두 없습니다`;
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

      {/* ① 들었나 — 높이 고정 판(2026-11-17 사용자 「심플하고 깔끔하게 · 내용이 바뀌어도 크기가 바뀌지 않게」).
          답 한 줄 + 3열 칸 한 줄(2026-11-18 칩 나열을 걷었다 · 사용자 「라벨을 늘어놓지 말 것」). 들어 있는 것부터, 넷 이상이면
          마지막 칸이 「+N개 전체 보기」 → 팝 박스(components/ui/GridPeek). */}
      <div className={s.answer}>
        <p className={s.answerLine}>
          <span className={s.answerIcon} aria-hidden>
            <Icon name={tone === 'hit' ? 'alert' : tone === 'clear' ? 'check' : 'sliders'} size={16} strokeWidth={2.4} />
          </span>
          <span className={s.answerText}>{answer}</span>
        </p>
        <div className={s.answerSlot}>
          {lens.avoid.length === 0 ? (
            <button type="button" className={s.answerCta} onClick={() => openEditor(4)}>
              피할 성분 정하기
              <Icon name="next" size={14} strokeWidth={2.2} />
            </button>
          ) : check.noIngredients ? (
            <span className={s.answerNote}>제품 화면의 원재료 목록이 비어 있습니다</span>
          ) : (
            <GridPeek
              className={s.answerGrid}
              preview={3}
              popTitle="피할 성분 확인"
              items={[...check.results]
                .sort((x, y) => (y.hits.length ? 1 : 0) - (x.hits.length ? 1 : 0))
                .map((r) => {
                  // 들어 있으면 「무엇이 · 얼마나」 — 칸 제목은 실제 원재료 이름(「당알코올 전체」 대신 「에리스리톨」), 아래 줄은 양(facts.hitAmount)
                  const ha = r.hits.length ? hitAmount(p, r.hits, mode) : null;
                  return ha
                    ? { key: r.item.k, title: ha.names, tone: 'hit' as const, icon: 'alert' as const, sub: ha.amount, long: `${r.item.l}\n${ha.detail}` }
                    : { key: r.item.k, title: r.item.l, tone: 'ok' as const, icon: 'check' as const, sub: '없음', long: '원재료 목록에 없습니다' };
                })}
            />
          )}
        </div>
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
