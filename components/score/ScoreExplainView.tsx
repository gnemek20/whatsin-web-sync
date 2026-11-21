'use client';

import { gradeOf, type GradeLetter } from './compat';
import type {
  ScoreExplain,
  ScoreExplainPart,
  ConcernPenaltyItem,
} from '@/lib/scoreTypes';
import styles from './ScoreExplainView.module.css';

// 제품 점수 계산 흐름 시각화 — base100(영양) − penalty(성분 감점) → 캡 → 최종 → 등급.
// 백엔드 /products/{id}/score-explain 의 저장된 사실값을 그대로 그린다(웹은 재계산하지 않음).

const REASON_LABEL: Record<string, string> = {
  non_food: '비식품(건기식·첨가물제제·주류 등)이라 종합점수를 매기지 않아요.',
  no_nutrition: '영양성분 정보가 없어 점수를 매길 수 없어요.',
  low_confidence_nutrition: '영양정보 신뢰도가 낮아(정규화 불확실) 점수를 보류했어요.',
  preparing: '원재료 분석 준비 중이라 아직 등급이 없어요.',
  no_score: '아직 점수가 산출되지 않은 제품이에요.',
};

const BS_LEVEL: Record<string, { label: string; tone: string }> = {
  low: { label: '혈당 부담 낮음', tone: 'var(--band-1-t)' },
  mid: { label: '혈당 부담 보통', tone: 'var(--band-2-t)' },
  high: { label: '혈당 부담 높음', tone: 'var(--band-4-t)' },
};

/** 점수(0~100)에 대한 게이지 채움 색 = 등급 점 색 */
function StepCard({
  n,
  title,
  desc,
  children,
}: {
  n: number;
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.step}>
      <div className={styles.stepHead}>
        <span className={styles.stepNo}>{n}</span>
        <div>
          <h3 className={styles.stepTitle}>{title}</h3>
          {desc && <p className={styles.stepDesc}>{desc}</p>}
        </div>
      </div>
      <div className={styles.stepBody}>{children}</div>
    </section>
  );
}

/** Nutri-Score 성분 막대 (감점=주황 / 가점=초록). 폭 ∝ 점수(최대 10 기준) */
function PartBar({ part }: { part: ScoreExplainPart }) {
  const isPen = part.kind === 'penalty';
  const pct = Math.min(100, (part.points / 10) * 100);
  const color = isPen ? 'var(--band-3)' : 'var(--band-1)';
  const dim = part.points <= 0;
  return (
    <div className={`${styles.part} ${dim ? styles.partDim : ''}`}>
      <div className={styles.partTop}>
        <span className={styles.partLabel}>{part.label}</span>
        {part.measured && <span className={styles.partMeasured}>{part.measured}</span>}
        <span className={styles.partPoints} style={{ color: dim ? 'var(--t3)' : color }}>
          {isPen ? '+' : '−'}
          {part.points}
        </span>
      </div>
      <div className={styles.partTrack}>
        <div
          className={styles.partFill}
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      {part.threshold_note && (
        <div className={styles.partNote}>{part.threshold_note}</div>
      )}
    </div>
  );
}

function ConcernRow({ item }: { item: ConcernPenaltyItem }) {
  const pct = Math.min(100, (item.weight / 20) * 100);
  return (
    <div className={styles.concernRow}>
      <div className={styles.concernTop}>
        <span className={styles.concernLabel}>
          {item.label}
          {item.high_severity && <span className={styles.highTag}>고위험</span>}
        </span>
        <span className={styles.concernWeight}>−{item.weight}</span>
      </div>
      <div className={styles.partTrack}>
        <div
          className={styles.partFill}
          style={{
            width: `${pct}%`,
            background: item.high_severity ? 'var(--band-4)' : 'var(--band-3)',
          }}
        />
      </div>
    </div>
  );
}

export default function ScoreExplainView({ data }: { data: ScoreExplain }) {
  const grade = gradeOf((data.grade || 'C') as GradeLetter);

  // 점수 미산출 — 사유 카드만.
  if (!data.scored || !data.nutrition_base || !data.penalty) {
    return (
      <div className={styles.wrap}>
        <div className={styles.notScored}>
          <div className={styles.nsTitle}>{data.name}</div>
          <div className={styles.nsDesc}>
            {REASON_LABEL[data.reason] ?? '점수를 매길 수 없는 제품이에요.'}
          </div>
        </div>
      </div>
    );
  }

  const nb = data.nutrition_base;
  const pen = data.penalty;
  const penalties = nb.parts.filter((p) => p.kind === 'penalty');
  const credits = nb.parts.filter((p) => p.kind === 'credit');
  // S 는 낮을수록 좋은 점수 → 0~100(높을수록 좋음)으로 뒤집어 환산한다.
  // 기준은 눈금의 양 끝: 가장 나쁨 = scale_hi(0점) · 가장 좋음 = scale_lo(100점).
  const round1 = (v: number) => Math.round(v * 10) / 10;
  const scaleSpan = round1(nb.scale_hi - nb.scale_lo); // 눈금 전체 폭 (일반식품 55 · 음료 40)
  const distFromWorst = round1(nb.scale_hi - nb.nutri_raw); // 최악 기준에서 좋아진 거리
  const rawPenaltySum = pen.concern_total + pen.additive_penalty;

  return (
    <div className={styles.wrap}>
      {/* 요약 배너 */}
      <div className={styles.hero}>
        <div className={styles.heroTop}>
          <span className={styles.heroDot} style={{ background: grade.dot }} />
          <div className={styles.heroInfo}>
            <div className={styles.heroName}>{data.name}</div>
            <div className={styles.heroMeta}>
              {data.brand}
              {data.food_type ? ` · ${data.food_type}` : ''}
              {data.serving_amount ? ` · 1회 ${data.serving_amount}g` : ''}
            </div>
          </div>
          <div className={styles.heroScoreBox}>
            <div className={styles.heroGrade} style={{ color: grade.text }}>
              {data.grade}
            </div>
            <div className={styles.heroScore}>
              <b>{data.final}</b>
              <span>/100</span>
            </div>
          </div>
        </div>
        <div className={styles.gauge}>
          <div
            className={styles.gaugeFill}
            style={{ width: `${data.final}%`, background: grade.dot }}
          />
        </div>
        <div className={styles.heroEq}>
          <span className={styles.eqTerm}>
            영양 기본 <b>{nb.base100}</b>
          </span>
          <span className={styles.eqOp}>−</span>
          <span className={styles.eqTerm}>
            성분 감점 <b>{pen.penalty_total}</b>
          </span>
          <span className={styles.eqOp}>=</span>
          <span className={styles.eqTerm}>{data.base_minus_penalty}</span>
          {data.caps.length > 0 && (
            <>
              <span className={styles.eqOp}>→</span>
              <span className={styles.eqTerm}>
                상한 <b>{Math.min(...data.caps.map((c) => c.cap))}</b>
              </span>
            </>
          )}
          <span className={styles.eqOp}>→</span>
          <span className={styles.eqFinal} style={{ color: grade.text }}>
            최종 <b>{data.final}</b> · {data.grade}
          </span>
        </div>
      </div>

      {/* ① 영양 기본점수 */}
      <StepCard
        n={1}
        title="영양 기본점수 (Nutri-Score)"
        desc={`${data.basis} 실측값으로 감점(N)·가점(P)을 매기고, S = N − P 를 0~100 으로 환산해요.`}
      >
        <div className={styles.npGrid}>
          <div>
            <div className={styles.npHead}>
              <span>감점 요인</span>
              <span className={styles.npSum} style={{ color: 'var(--band-3-t)' }}>
                N = {nb.n_total}
              </span>
            </div>
            {penalties.map((p) => (
              <PartBar key={p.key} part={p} />
            ))}
          </div>
          <div>
            <div className={styles.npHead}>
              <span>가점 요인</span>
              <span className={styles.npSum} style={{ color: 'var(--band-1-t)' }}>
                P = {nb.p_total}
              </span>
            </div>
            {credits.map((p) => (
              <PartBar key={p.key} part={p} />
            ))}
          </div>
        </div>

        {nb.protein_rule_note && (
          <div className={styles.ruleNote}>ⓘ {nb.protein_rule_note}</div>
        )}

        <div className={styles.formula}>
          <div className={styles.formulaRow}>
            <span>S = N − P</span>
            <span className={styles.formulaVal}>
              {nb.n_total} − {nb.p_total} = {nb.nutri_raw}
            </span>
          </div>
          {/* S 는 낮을수록 좋은 점수라 그대로 쓸 수 없다. 눈금의 양 끝(가장 나쁨·가장 좋음)을
              먼저 보여주고, 그 사이에서 내 S 의 위치를 100점 만점으로 환산하는 과정을 펼친다. */}
          <div className={styles.scaleIntro}>
            S 는 낮을수록 좋아요. 그래서 아래 두 기준점 사이에서 내 S 가 어디쯤인지로 100점 만점 점수를 매겨요.
          </div>

          <div className={styles.scaleRow}>
            <span className={styles.scaleLabel}>
              가장 나쁨 · S = {nb.scale_hi}
              <em className={styles.scaleWhy}>
                감점 4항목(에너지·당·포화지방·나트륨)을 각 10점씩 다 받고 가점은 0일 때
              </em>
            </span>
            <span className={styles.scaleVal}>0점</span>
          </div>

          <div className={styles.scaleRow}>
            <span className={styles.scaleLabel}>
              가장 좋음 · S = {nb.scale_lo}
              <em className={styles.scaleWhy}>
                {nb.beverage
                  ? '음료는 별도 임계표를 써서 0 을 최고 기준으로 둬요'
                  : '감점이 0 이고 가점을 최대 15점(과채·견과 5 + 식이섬유 5 + 단백질 5) 받을 때'}
              </em>
            </span>
            <span className={styles.scaleVal}>100점</span>
          </div>

          <div className={styles.formulaRow}>
            <span>
              ① 가장 나쁨에서 좋아진 만큼
              <em className={styles.scaleWhy}>내 S 가 최악 기준에서 떨어진 거리</em>
            </span>
            <span className={styles.formulaVal}>
              {nb.scale_hi} − {nb.nutri_raw} = <b>{distFromWorst}</b>
            </span>
          </div>

          <div className={styles.formulaRow}>
            <span>
              ② 눈금 전체 폭
              <em className={styles.scaleWhy}>가장 나쁨 → 가장 좋음 사이 거리</em>
            </span>
            <span className={styles.formulaVal}>
              {nb.scale_hi} − ({nb.scale_lo}) = <b>{scaleSpan}</b>
            </span>
          </div>

          <div className={`${styles.formulaRow} ${styles.formulaResult}`}>
            <span>
              영양 기본점수
              <em className={styles.scaleWhy}>
                ① ÷ ② × 100 = {distFromWorst} ÷ {scaleSpan} × 100
              </em>
            </span>
            <span className={styles.formulaVal}>
              <b>{nb.base100}</b> / 100
              {nb.nutri_grade ? ` · Nutri ${nb.nutri_grade}` : ''}
            </span>
          </div>

          <div className={styles.formulaCompact}>{nb.base_formula}</div>
        </div>
      </StepCard>

      {/* ② 성분 감점 */}
      <StepCard
        n={2}
        title="성분 감점"
        desc="주의 성분(가중치 합)과 가공도(첨가물 수)를 영양 기본점수에서 빼요."
      >
        <div className={styles.subHead}>
          주의 성분 <span className={styles.subSum}>−{pen.concern_total}</span>
        </div>
        {pen.concern_items.length > 0 ? (
          pen.concern_items.map((it) => <ConcernRow key={it.tag} item={it} />)
        ) : (
          <div className={styles.emptyLine}>감점 대상 주의 성분이 없어요.</div>
        )}

        <div className={styles.subHead}>
          첨가물 <span className={styles.subSum}>−{pen.additive_penalty}</span>
        </div>
        <div className={styles.additiveLine}>
          {pen.additive_count}종 × 2 = {pen.additive_count * 2}
          {pen.additive_count * 2 > pen.additive_penalty &&
            ` → ${pen.additive_penalty} (상한 15)`}
        </div>
        {pen.additive_names.length > 0 && (
          <div className={styles.chips}>
            {pen.additive_names.map((nm) => (
              <span key={nm} className={styles.chip}>
                {nm}
              </span>
            ))}
          </div>
        )}

        <div className={styles.penTotal}>
          <span>총 감점</span>
          <span className={styles.penTotalVal}>
            {pen.penalty_cap_hit ? (
              <>
                {rawPenaltySum} → <b>{pen.penalty_total}</b> (상한 {pen.penalty_cap})
              </>
            ) : (
              <b>{pen.penalty_total}</b>
            )}
          </span>
        </div>
      </StepCard>

      {/* ③ 상한(캡) */}
      <StepCard
        n={3}
        title="상한 (캡)"
        desc="특정 조건이면 최종점수의 천장을 낮춰요. base − 감점이 이미 낮으면 실제로 깎이진 않아요."
      >
        {data.caps.length > 0 ? (
          data.caps.map((c) => (
            <div key={c.flag} className={styles.capRow}>
              <div className={styles.capTop}>
                <span className={styles.capLabel}>{c.label}</span>
                <span className={styles.capVal}>≤ {c.cap}점</span>
              </div>
              {c.note && <div className={styles.capNote}>{c.note}</div>}
            </div>
          ))
        ) : (
          <div className={styles.emptyLine}>적용된 상한이 없어요.</div>
        )}
      </StepCard>

      {/* ④ 최종 & 등급 */}
      <StepCard n={4} title="최종 점수 & 등급">
        <div className={styles.finalRow}>
          <span className={styles.finalCalc}>
            {nb.base100} − {pen.penalty_total}
            {data.caps.length > 0
              ? ` = ${data.base_minus_penalty} → 상한 ${Math.min(...data.caps.map((c) => c.cap))}`
              : ` = ${data.base_minus_penalty}`}
          </span>
          <span className={styles.finalArrow}>→</span>
          <span className={styles.finalScore} style={{ color: grade.text }}>
            <b>{data.final}</b> / 100
          </span>
          <span className={styles.finalGrade} style={{ background: grade.dot }}>
            {data.grade}
          </span>
        </div>
        <div className={styles.gradeLabelLine} style={{ color: grade.text }}>
          {grade.label}
        </div>
        <div className={styles.gradeNote}>{data.grade_note}</div>
      </StepCard>

      {/* 별도: 혈당부하 */}
      {data.blood_sugar && (
        <div className={styles.bsCard}>
          <div className={styles.bsHead}>
            <span className={styles.bsTitle}>혈당부하(GL) 추정</span>
            <span className={styles.bsBadge} style={{ color: BS_LEVEL[data.blood_sugar.level]?.tone }}>
              {BS_LEVEL[data.blood_sugar.level]?.label ?? data.blood_sugar.level}
            </span>
          </div>
          <div className={styles.bsNote}>
            혈당 배지는 별도 추정치예요 — <b>종합점수(A~E)에는 반영되지 않아요.</b>
          </div>
          <div className={styles.bsGrid}>
            <div>
              <span>추정 GL</span>
              <b>{data.blood_sugar.gl}</b>
            </div>
            <div>
              <span>식품 GI</span>
              <b>{data.blood_sugar.gi}</b>
            </div>
            <div>
              <span>가용 탄수(100)</span>
              <b>{data.blood_sugar.avail_carb_100 ?? '—'}g</b>
            </div>
            <div>
              <span>당류 / 전분</span>
              <b>
                {data.blood_sugar.sugars_c ?? '—'} / {data.blood_sugar.starch_c ?? '—'}g
              </b>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
