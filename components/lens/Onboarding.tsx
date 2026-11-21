'use client';
// 온보딩 — 내 기준 만들기. 2026-11-16 전면 다시(사용자 「완전한 리디자인 · 모달 크기 고정 · 공간을 충분히 · 정렬을 깔끔하게 · 선택은 여러 개」).
//   창 크기는 고정(PC 960×660 · 모바일 전체 화면) — 단계마다 창이 출렁이지 않고, 고르는 칸이 남는 자리를 고르게 나눠 채운다.
//   PC — 왼쪽 단계 목록(지금 · 끝낸 단계 · 누르면 이동) | 오른쪽 질문. 모바일 — 위 진행 막대 + 질문 + 아래 단추.
//   시작 화면 — 왼쪽 무엇인지(제목 · 한 줄) · 오른쪽 「내 기준으로 본 화면」 예시. 그라데이션은 쓰지 않는다(홈 배너만).
// 다섯 단계: 목적(여러 개) → 아는 정도(하나 — 한 줄 척도 · 2026-11-17 「얼마나 잘 알고 계세요?」 사용자 · 「성분표」 낱말은 쓰지 않는다) → 먼저 볼 숫자(3개까지 · 고른 순서) → 피할 성분(여러 개 · 추천 + 사전 검색) → 확인과 동의.
// 받지 않는 것(pmf-research §3) — 검사 수치 · 진단명 · 알레르기(라벨 알레르기 자료가 일부뿐). 허락 문장(「먹어도 됩니다」)을 만들지 않는다.
// 처음 온 사람에게 모달로 뜨고 어느 화면에서든 바로 닫을 수 있다(11-16 · 닫으면 이번 접속 동안 다시 안 뜬다 — LensProvider).
// 기준이 이미 있으면(수정) 마지막 확인 단계에서 연다. 「지우고 처음부터」는 목적 단계부터(LensProvider 가 새로 띄운다).
import { track } from '@/lib/track';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AVOID_PRESETS,
  GOALS,
  LEVELS,
  MAX_AVOID,
  MAX_FOCUS,
  NUTRIENTS,
  NUTRIENT_ORDER,
  defaultFocus,
  suggestedAvoid,
  type AvoidItem,
  type AvoidPreset,
  type GoalId,
  type Lens,
  type Level,
  type NutrientKey,
} from '@/lib/lens';
import { Icon, type IconName } from '../ui/Icon';
import { LogoMark } from '../site/Logo';
import { FoodTile } from '../FoodTile';
import s from './onboarding.module.css';

type Props = {
  initial: Lens | null;
  startStep: number;
  onClose: () => void;
  onSave: (l: Lens) => void;
  onReset: () => void;
};

const STEPS = ['목적', '아는 정도', '먼저 볼 정보', '피할 성분', '확인'];
const LAST = STEPS.length; // 0 = 시작 화면 · 1..5 = 단계

type Hit = { key: string; name: string; tag: string };

// 줄 나누기 — 칸 수(PC · 모바일)대로 줄을 만들고, 줄마다 남는 높이를 똑같이 나눠 갖는다(flex · grid 를 쓰지 않는다 — 웹 규칙).
//   마지막 줄이 모자라면 빈 자리를 채워 칸 폭이 다른 줄과 같다. fill=false 면 높이는 내용만큼(긴 목록).
const MOBILE = '(max-width: 759px)';
function useMobile() {
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.matchMedia(MOBILE).matches);
  useEffect(() => {
    const mq = window.matchMedia(MOBILE);
    const on = () => setM(mq.matches);
    on();
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return m;
}

/** rowMax — 줄의 「바라는 높이」[PC, 모바일](내용이 더 길면 그만큼 커진다 · 2026-11-17). 칸 내용이 짧은 단계는 낮게 — 빈 칸 · 넘침을 막는다 */
function Rows({ cols, children, fill = true, label, role, rowMax }: { cols: [number, number]; children: React.ReactNode[]; fill?: boolean; label?: string; role?: string; rowMax?: [number, number] }) {
  const n = useMobile() ? cols[1] : cols[0];
  const rows: React.ReactNode[][] = [];
  for (let i = 0; i < children.length; i += n) rows.push(children.slice(i, i + n));
  return (
    <div
      className={`${s.rows} ${fill ? s.rowsFill : ''}`}
      role={role}
      aria-label={label}
      style={rowMax ? ({ ['--row-max-pc' as string]: `${rowMax[0]}px`, ['--row-max-m' as string]: `${rowMax[1]}px` } as React.CSSProperties) : undefined}
    >
      {rows.map((r, i) => (
        <div key={i} className={s.row} style={{ ['--n' as string]: n }}>
          {r}
          {Array.from({ length: n - r.length }, (_, j) => (
            <span key={`pad${j}`} className={s.pad} aria-hidden />
          ))}
        </div>
      ))}
    </div>
  );
}

export function Onboarding({ initial, startStep, onClose, onSave, onReset }: Props) {
  const [step, setStep] = useState(initial ? (startStep || LAST) : startStep);
  const [reached, setReached] = useState(initial ? LAST : startStep);
  const [goals, setGoals] = useState<GoalId[]>(initial?.goals ?? []);
  const [level, setLevel] = useState<Level | null>(initial?.level ?? null);
  const [focus, setFocus] = useState<NutrientKey[]>(initial?.focus ?? []);
  const [focusTouched, setFocusTouched] = useState(!!initial);
  const [avoid, setAvoid] = useState<AvoidItem[]>(initial?.avoid ?? []);
  const [agree, setAgree] = useState(!!initial);
  const body = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => track({ name: 'lens_open', tab: startStep != null ? String(startStep) : undefined }), []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);
  useEffect(() => {
    setReached((r) => Math.max(r, step));
    body.current?.scrollTo({ top: 0 });
    body.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus({ preventScroll: true });
  }, [step]);

  // 목적이 바뀌면 숫자를 아직 손대지 않았을 때만 기본값으로 채운다.
  useEffect(() => {
    if (!focusTouched) setFocus(goals.length ? defaultFocus(goals) : []);
  }, [goals, focusTouched]);

  const done = [goals.length > 0, level != null, focus.length > 0, true, agree];
  const canNext =
    step === 0 ? true
      : step === 1 ? goals.length > 0
        : step === 2 ? level != null
          : step === 3 ? focus.length > 0
            : step === 4 ? true
              : agree && focus.length > 0 && goals.length > 0 && level != null;

  const finish = () => {
    if (!canNext || !level) return;
    track({ name: 'lens_done', props: { goals: goals.join(','), level, focus: focus.join(','), avoid: avoid.length } });
    onSave({ v: 1, goals, level, focus, avoid, at: Date.now() });
  };
  const next = () => (step === LAST ? finish() : canNext && setStep(step + 1));

  const note =
    step === 1 ? (goals.length ? `${goals.length}개 선택` : '')
      : step === 3 ? `${focus.length}/${MAX_FOCUS} 선택`
        : step === 4 ? (avoid.length ? `${avoid.length}개 선택` : '없으면 다음')
          : step === LAST ? (agree ? '' : '저장 동의가 필요합니다')
            : '';

  if (!mounted) return null;
  return createPortal(
    <div className={`ui ${s.scrim}`} role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={s.dialog} role="dialog" aria-modal="true" aria-labelledby="ob-title">
        <button type="button" className={`${s.iconBtn} ${s.close}`} onClick={onClose} aria-label="닫기">
          <Icon name="close" size={20} />
        </button>

        {step === 0 ? (
          <Welcome onStart={() => setStep(1)} onLater={onClose} />
        ) : (
          <>
            {/* PC 왼쪽 — 단계 목록(끝낸 단계는 눌러서 돌아간다) */}
            <aside className={s.rail}>
              <p className={s.mark}>
                <LogoMark size={28} />
                What&apos;s In?
              </p>
              <p className={s.railTitle}>내 기준 만들기</p>
              <ol className={s.stepList}>
                {STEPS.map((name, i) => {
                  const n = i + 1;
                  const cur = n === step;
                  const ok = n < step && done[i];
                  const can = n <= reached;
                  return (
                    <li key={name}>
                      <button
                        type="button"
                        className={`${s.stepItem} ${cur ? s.stepCur : ''} ${ok ? s.stepOk : ''}`}
                        onClick={() => can && setStep(n)}
                        disabled={!can}
                        aria-current={cur ? 'step' : undefined}
                      >
                        <span className={`${s.stepNum} num`} aria-hidden>
                          {ok ? <Icon name="check" size={14} /> : n}
                        </span>
                        {name}
                      </button>
                    </li>
                  );
                })}
              </ol>
              <p className={s.railFoot}>의료 진단을 대신하지 않습니다.</p>
            </aside>

            <section className={s.main}>
              <header className={s.mainHead}>
                <span className={`${s.count} num`}>
                  {step} / {STEPS.length}
                </span>
                {/* 모바일 — 단계 목록 대신 진행 막대 */}
                <ol className={s.progress} aria-label={`${STEPS.length}단계 중 ${step}단계`}>
                  {STEPS.map((name, i) => (
                    <li key={name} className={i < step ? s.on : undefined}>
                      <span className="sr-only">{name}</span>
                    </li>
                  ))}
                </ol>
              </header>

              <div className={s.body} ref={body}>
                {step === 1 ? <Goals goals={goals} setGoals={setGoals} /> : null}
                {step === 2 ? <Levels level={level} setLevel={setLevel} /> : null}
                {step === 3 ? (
                  <Focus
                    focus={focus}
                    setFocus={(f) => {
                      setFocusTouched(true);
                      setFocus(f);
                    }}
                    reset={() => {
                      setFocusTouched(false);
                      setFocus(defaultFocus(goals));
                    }}
                    level={level}
                  />
                ) : null}
                {step === 4 ? <Avoid avoid={avoid} setAvoid={setAvoid} goals={goals} /> : null}
                {step === LAST ? (
                  <Review goals={goals} level={level} focus={focus} avoid={avoid} agree={agree} setAgree={setAgree} go={setStep} editing={!!initial} onReset={onReset} />
                ) : null}
              </div>

              <footer className={s.foot}>
                <button type="button" className={s.prev} onClick={() => setStep(step - 1)}>
                  <Icon name="back" size={18} />
                  이전
                </button>
                <span className={`${s.footNote} num`}>{note}</span>
                <button type="button" className={`btn btn-primary btn-lg ${s.nextBtn}`} onClick={next} disabled={!canNext}>
                  {step === LAST ? (initial ? '저장' : '시작하기') : '다음'}
                </button>
              </footer>
            </section>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

// ── 0. 시작 ──────────────────────────────────────────────────────────────

function Welcome({ onStart, onLater }: { onStart: () => void; onLater: () => void }) {
  // 처음 뜨는 화면 — 무엇인지(제품에서 내게 필요한 정보를 단번에)와 맞춤이라는 점을 한눈에.
  //   설명을 늘어놓지 않고 「내 기준으로 본 화면」 예시 하나로 보인다(제품 화면 맨 위 「내 기준으로 보면」과 같은 모양 · 이름 · 숫자는 예시).
  return (
    <div className={s.welcome}>
      <div className={s.wLeft}>
        <p className={s.mark}>
          <LogoMark size={28} />
          What&apos;s In?
        </p>
        <div className={s.wHead}>
          <h2 id="ob-title" className={s.wTitle}>
            제품에서
            <br />
            <span className={s.accent}>내게 필요한</span> 정보를
            <br />
            단번에
          </h2>
          <p className={s.wSub}>
            나만의 기준을 만들고,
            <br />
            나에게 맞는 제품인지 바로 확인해 보세요!
          </p>
        </div>
        <div className={s.wActions}>
          <button type="button" className="btn btn-primary btn-lg btn-block" onClick={onStart} data-autofocus>
            내 기준 만들기
          </button>
          <button type="button" className={s.later} onClick={onLater}>
            나중에 할게요
          </button>
        </div>
      </div>

      <div className={s.wRight}>
        <div className={s.demo} aria-label="내 기준으로 본 화면 예시">
          <div className={s.demoTop}>
            <FoodTile kind="snack" size={56} />
            <span className={s.demoName}>
              <b>초코 크런치바</b>
              <span>예시 제품</span>
            </span>
          </div>
          <p className={s.demoHit}>
            <Icon name="alert" size={18} />
            {/* 피할 성분은 이미 내가 고른 것 — 「피하는」 말을 붙이지 않고 이름과 양만(2026-11-17 사용자) */}
            <b>말티톨</b>
            <b className="num">12g</b>
          </p>
          <dl className={s.demoNums}>
            {/* 아래 세 칸 — 열량 · 단백질 · 당류(2026-11-17 사용자). 값은 예시 */}
            <div className={s.demoFirst}>
              <dt>열량</dt>
              <dd className="num">210kcal</dd>
            </div>
            <div>
              <dt>단백질</dt>
              <dd className="num">4g</dd>
            </div>
            <div>
              <dt>당류</dt>
              <dd className="num">3g</dd>
            </div>
          </dl>
        </div>
        <p className={s.demoCap}>내 기준으로 본 제품 화면</p>
      </div>
    </div>
  );
}

// ── 단계 머리 ────────────────────────────────────────────────────────────

function StepHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className={s.stepHead}>
      <h2 id="ob-title" className={s.stepTitle}>{title}</h2>
      {sub ? <p className={s.stepSub}>{sub}</p> : null}
    </div>
  );
}

// ── 1. 목적(여러 개) ─────────────────────────────────────────────────────

const GOAL_ICON: Record<GoalId, IconName> = { glucose: 'cup', weight: 'apple', protein: 'bowl', sodium: 'alert', additives: 'flask', kids: 'heart' };

function Goals({ goals, setGoals }: { goals: GoalId[]; setGoals: (g: GoalId[]) => void }) {
  const toggle = (id: GoalId) => setGoals(goals.includes(id) ? goals.filter((g) => g !== id) : [...goals, id]);
  return (
    <div className={s.step}>
      <StepHead title="어떤 목적으로 이용하시나요?" sub="여러 개 고를 수 있습니다" />
      <Rows cols={[3, 2]}>
        {GOALS.map((g, i) => {
          const on = goals.includes(g.id);
          return (
            <button key={g.id} type="button" className={s.card} aria-pressed={on} onClick={() => toggle(g.id)} data-autofocus={i === 0 ? true : undefined}>
              <span className={s.cardTop}>
                <span className={s.cardIcon} aria-hidden>
                  <Icon name={GOAL_ICON[g.id]} size={22} />
                </span>
                <span className={s.check} aria-hidden>
                  <Icon name="check" size={14} />
                </span>
              </span>
              <span className={s.cardLabel}>{g.label}</span>
            </button>
          );
        })}
      </Rows>
    </div>
  );
}

// 이름 끝 괄호(「당알코올 (에리스리톨 제외)」)는 줄을 내려 따로 — 칸 안에서 괄호가 어중간하게 꺾이지 않게(2026-11-17 사용자).
function PickName({ l }: { l: string }) {
  const m = l.match(/^(.*?)\s*(\([^()]*\))$/);
  if (!m) return <>{l}</>;
  return (
    <>
      {m[1]}
      <span className={s.pickQual}>{m[2]}</span>
    </>
  );
}

// ── 2. 아는 정도(하나) ─────────────────────────────────────────────────

// 고르면 숫자 하나가 어떻게 보이는지 — 예시 한 칸(당류 12g)
const LEVEL_SAMPLE: Record<Level, string | null> = {
  new: NUTRIENTS.sugar.desc,
  some: '궁금할 때 눌러서 봅니다',
  own: null,
};

function Levels({ level, setLevel }: { level: Level | null; setLevel: (l: Level) => void }) {
  return (
    <div className={s.step}>
      <StepHead title="얼마나 잘 알고 계세요?" sub="하나를 고릅니다" />
      <Rows cols={[3, 1]} role="radiogroup" label="아는 정도">
        {LEVELS.map((l, i) => {
          const on = level === l.id;
          return (
            <button
              key={l.id}
              type="button"
              role="radio"
              aria-checked={on}
              className={s.card}
              onClick={() => setLevel(l.id)}
              data-autofocus={i === 0 ? true : undefined}
            >
              <span className={s.cardTop}>
                <span className={s.cardLabel}>{l.label}</span>
                <span className={s.radio} aria-hidden />
              </span>
              <span className={s.cardDesc}>{l.desc}</span>
              <span className={s.sample} aria-hidden>
                <span className={s.sampleRow}>
                  <span className={s.sampleK}>당류</span>
                  <span className={`${s.sampleV} num`}>12g</span>
                  {l.id === 'some' ? <Icon name="info" size={16} /> : null}
                </span>
                {LEVEL_SAMPLE[l.id] ? <span className={s.sampleDesc}>{LEVEL_SAMPLE[l.id]}</span> : null}
              </span>
            </button>
          );
        })}
      </Rows>
    </div>
  );
}

// ── 3. 먼저 볼 숫자(3개까지 · 고른 순서) ─────────────────────────────────

function Focus({ focus, setFocus, reset, level }: { focus: NutrientKey[]; setFocus: (f: NutrientKey[]) => void; reset: () => void; level: Level | null }) {
  const toggle = (k: NutrientKey) => {
    if (focus.includes(k)) setFocus(focus.filter((x) => x !== k));
    else if (focus.length < MAX_FOCUS) setFocus([...focus, k]);
  };
  const full = focus.length >= MAX_FOCUS;
  return (
    <div className={s.step}>
      <div className={s.headRow}>
        <StepHead title="가장 빨리 보고 싶은 정보" sub={`${MAX_FOCUS}개까지, 고른 순서대로 보여 드립니다`} />
        <button type="button" className={s.textBtn} onClick={reset}>
          목적에 맞게 다시
        </button>
      </div>
      <Rows cols={[3, 2]} rowMax={[112, 104]}>
        {NUTRIENT_ORDER.map((k, i) => {
          const n = NUTRIENTS[k];
          const order = focus.indexOf(k) + 1;
          const on = order > 0;
          return (
            <button
              key={k}
              type="button"
              className={`${s.card} ${s.cardDense}`}
              aria-pressed={on}
              disabled={!on && full}
              onClick={() => toggle(k)}
              data-autofocus={i === 0 ? true : undefined}
            >
              <span className={s.cardTop}>
                <span className={s.cardLabel}>{n.label}</span>
                <span className={`${s.order} num`} aria-hidden>{on ? order : ''}</span>
              </span>
              {level !== 'own' ? <span className={s.cardDesc}>{n.desc}</span> : null}
            </button>
          );
        })}
      </Rows>
    </div>
  );
}

// ── 4. 피할 성분(여러 개) ────────────────────────────────────────────────

function Avoid({ avoid, setAvoid, goals }: { avoid: AvoidItem[]; setAvoid: (a: AvoidItem[]) => void; goals: GoalId[] }) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [loading, setLoading] = useState(false);
  const has = (k: string) => avoid.some((a) => a.k === k);
  const add = (a: AvoidItem) => !has(a.k) && avoid.length < MAX_AVOID && setAvoid([...avoid, a]);
  const remove = (k: string) => setAvoid(avoid.filter((a) => a.k !== k));
  const toggle = (a: AvoidItem) => (has(a.k) ? remove(a.k) : add(a));

  const suggested = useMemo(() => new Set(suggestedAvoid(goals)), [goals]);
  // 조사에서 많이 나온 것은 언급 순서 그대로(목적 추천은 표시만) · 그 밖은 접어 둔다(골라 둔 것이 있으면 펼친다).
  const top = AVOID_PRESETS.filter((p) => p.top);
  const more = AVOID_PRESETS.filter((p) => !p.top);
  const [showMore, setShowMore] = useState(() => more.some((p) => avoid.some((a) => a.k === p.k)));
  const pick = (p: AvoidPreset) => toggle(p.ks ? { k: p.k, l: p.l, t: p.t, ks: p.ks } : { k: p.k, l: p.l, t: p.t });
  // 사전에서 찾아 넣은 것(추천 목록 밖) — 따로 보인다
  const custom = avoid.filter((a) => !AVOID_PRESETS.some((p) => p.k === a.k));
  const presetList = (xs: AvoidPreset[]) => (
    <Rows cols={[3, 2]} fill={false}>
      {xs.map((p) => {
        const on = has(p.k);
        return (
            <button key={p.k} type="button" className={s.pick} aria-pressed={on} onClick={() => pick(p)}>
              <span className={s.pickText}>
                <span className={s.pickLabel}>
                  <PickName l={p.l} />
                  {suggested.has(p.k) && !on ? <span className={s.suggest}>추천</span> : null}
                </span>
                {p.hint ? <span className={s.pickHint}>{p.hint}</span> : null}
              </span>
              <span className={s.check} aria-hidden>
                <Icon name="check" size={14} />
              </span>
            </button>
        );
      })}
    </Rows>
  );

  useEffect(() => {
    const t = q.trim();
    if (t.length < 1) {
      setHits(null);
      return;
    }
    setLoading(true);
    const ctl = new AbortController();
    const id = window.setTimeout(async () => {
      try {
        const r = await fetch(`/api/ingredients?q=${encodeURIComponent(t)}`, { signal: ctl.signal });
        setHits(r.ok ? await r.json() : []);
      } catch {
        if (!ctl.signal.aborted) setHits([]);
      } finally {
        if (!ctl.signal.aborted) setLoading(false);
      }
    }, 220);
    return () => {
      ctl.abort();
      window.clearTimeout(id);
    };
  }, [q]);

  return (
    <div className={s.step}>
      <StepHead title="피하고 싶은 성분" sub="여러 개 고를 수 있습니다. 없으면 넘어가도 됩니다" />

      <div className={s.searchWrap}>
        <label className={s.search}>
          <Icon name="search" size={18} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="성분 이름"
            aria-label="성분 이름으로 찾기"
            data-autofocus
          />
          <button type="button" className={s.clear} onClick={() => setQ('')} aria-label="지우기" tabIndex={q ? 0 : -1} style={q ? undefined : { visibility: 'hidden' }}>
            <Icon name="close" size={16} />
          </button>
        </label>

        {hits !== null ? (
          <div className={s.results} aria-live="polite">
            {loading && !hits.length ? <p className={s.resultsNote}>찾는 중</p> : null}
            {!loading && hits.length === 0 ? <p className={s.resultsNote}>결과 없음</p> : null}
            <ul>
              {hits.slice(0, 8).map((h) => (
                <li key={h.key}>
                  <button type="button" className={s.resultRow} onClick={() => toggle({ k: h.key, l: h.name, t: 'i' })} aria-pressed={has(h.key)}>
                    <span>
                      <span className="strong">{h.name}</span>
                      {h.tag ? <span className="tiny faint"> {h.tag}</span> : null}
                    </span>
                    <Icon name={has(h.key) ? 'check' : 'plus'} size={18} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {custom.length ? (
        <>
          <p className={s.groupHead}>찾아서 넣은 성분</p>
          <Rows cols={[3, 2]} fill={false}>
            {custom.map((a) => (
              <button key={a.k} type="button" className={s.pick} aria-pressed onClick={() => remove(a.k)} aria-label={`${a.l} 빼기`}>
                <span className={s.pickText}>
                  <span className={s.pickLabel}>
                    <PickName l={a.l} />
                  </span>
                </span>
                <span className={s.check} aria-hidden>
                  <Icon name="check" size={14} />
                </span>
              </button>
            ))}
          </Rows>
        </>
      ) : null}

      <p className={s.groupHead}>많이 피하는 성분</p>
      {presetList(top)}
      {showMore ? (
        <>
          <p className={s.groupHead}>그 밖의 성분</p>
          {presetList(more)}
        </>
      ) : (
        <button type="button" className={s.moreBtn} onClick={() => setShowMore(true)}>
          <Icon name="down" size={16} />
          {more.length}개 더 보기
        </button>
      )}
      <p className={s.fine}>알레르기는 포장 표시로 확인 바랍니다.</p>
    </div>
  );
}

// ── 5. 확인과 동의 ───────────────────────────────────────────────────────
// 2026-11-16 — 회색 목록 + 알약 대신 같은 크기 카드 넷(2×2 · 모바일 한 줄씩)이 남는 자리를 채운다. 값은 알약이 아니라 줄 목록.

function Review({
  goals,
  level,
  focus,
  avoid,
  agree,
  setAgree,
  go,
  editing,
  onReset,
}: {
  goals: GoalId[];
  level: Level | null;
  focus: NutrientKey[];
  avoid: AvoidItem[];
  agree: boolean;
  setAgree: (b: boolean) => void;
  go: (n: number) => void;
  editing: boolean;
  onReset: () => void;
}) {
  const lv = LEVELS.find((l) => l.id === level);
  return (
    <div className={s.step}>
      <div className={s.headRow}>
        <StepHead title="내 기준" sub="이 기준으로 제품을 보여 드립니다" />
        {editing ? (
          <button type="button" className={s.textBtn} onClick={onReset}>
            지우고 처음부터
          </button>
        ) : null}
      </div>

      <Rows cols={[2, 1]} rowMax={[120, 96]}>
        <ReviewCard key="g" name="목적" onEdit={() => go(1)}>
          {goals.length ? (
            <p className={s.rText}>{goals.map((g) => GOALS.find((x) => x.id === g)?.label).join(', ')}</p>
          ) : (
            <p className={s.rEmpty}>고르지 않음</p>
          )}
        </ReviewCard>

        <ReviewCard key="l" name="아는 정도" onEdit={() => go(2)}>
          {lv ? (
            <div className={s.rLevel}>
              <b>{lv.label}</b>
              <span>{lv.desc}</span>
            </div>
          ) : (
            <p className={s.rEmpty}>고르지 않음</p>
          )}
        </ReviewCard>

        <ReviewCard key="f" name="먼저 볼 정보" onEdit={() => go(3)}>
          <ol className={s.rList}>
            {focus.map((k, i) => (
              <li key={k}>
                <span className={`${s.rNum} num`}>{i + 1}</span>
                {NUTRIENTS[k].label}
              </li>
            ))}
          </ol>
        </ReviewCard>

        <ReviewCard key="a" name="피할 성분" onEdit={() => go(4)}>
          {avoid.length ? (
            <p className={s.rText}>
              {avoid.slice(0, 6).map((a) => a.l).join(', ')}
              {avoid.length > 6 ? <span className={s.rMore}> 외 {avoid.length - 6}개</span> : null}
            </p>
          ) : (
            <p className={s.rEmpty}>없음</p>
          )}
        </ReviewCard>
      </Rows>

      <label className={`${s.agree} ${agree ? s.agreeOn : ''}`}>
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} data-autofocus />
        <span className={s.box} aria-hidden>
          <Icon name="check" size={14} />
        </span>
        <span className={s.agreeText}>
          <b>이 브라우저에 저장하는 데 동의합니다 (필수)</b>
          <span>기준은 이 브라우저에만 저장됩니다. 의료 진단을 대신하지 않습니다.</span>
        </span>
      </label>
    </div>
  );
}

function ReviewCard({ name, onEdit, children }: { name: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <div className={s.rCard}>
      <div className={s.rHead}>
        <span className={s.rName}>{name}</span>
        <button type="button" className={s.rEdit} onClick={onEdit} aria-label={`${name} 고치기`}>
          고치기
          <Icon name="next" size={14} />
        </button>
      </div>
      <div className={s.rBody}>{children}</div>
    </div>
  );
}
