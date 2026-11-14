'use client';
// 온보딩 — 내 기준 만들기(2026-11-13 웹 개편). 처음 온 사람에게는 닫기 없이 뜬다(사용자 「반드시 모달로 온보딩을 시작」).
// 다섯 단계: 목적 → 익숙한 정도 → 먼저 볼 영양(최대 3 · 고른 순서) → 피할 성분(추천 + 사전 검색) → 확인과 동의.
// 받지 않는 것(pmf-research §3) — 검사 수치 · 진단명 · 알레르기(라벨 알레르기 자료가 일부뿐). 허락 문장(「먹어도 됩니다」)을 만들지 않는다.
// 기준이 이미 있으면(수정) 마지막 확인 단계에서 열고 닫을 수 있다.
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AVOID_PRESETS,
  GOALS,
  LEVELS,
  MAX_AVOID,
  MAX_FOCUS,
  MAX_GOALS,
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
import { Icon } from '../ui/Icon';
import { LogoMark } from '../site/Logo';
import s from './onboarding.module.css';

type Props = {
  initial: Lens | null;
  startStep: number;
  dismissible: boolean;
  onClose: () => void;
  onSave: (l: Lens) => void;
  onReset: () => void;
};

const STEPS = ['목적', '익숙한 정도', '먼저 볼 영양', '피할 성분', '확인'];
const LAST = STEPS.length; // 0 = 시작 화면 · 1..5 = 단계

type Hit = { key: string; name: string; tag: string };

export function Onboarding({ initial, startStep, dismissible, onClose, onSave, onReset }: Props) {
  const [step, setStep] = useState(initial ? (startStep || LAST) : 0);
  const [goals, setGoals] = useState<GoalId[]>(initial?.goals ?? []);
  const [level, setLevel] = useState<Level | null>(initial?.level ?? null);
  const [focus, setFocus] = useState<NutrientKey[]>(initial?.focus ?? []);
  const [focusTouched, setFocusTouched] = useState(!!initial);
  const [avoid, setAvoid] = useState<AvoidItem[]>(initial?.avoid ?? []);
  const [agree, setAgree] = useState(!!initial);
  const body = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissible) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [dismissible, onClose]);
  useEffect(() => {
    body.current?.scrollTo({ top: 0 });
    body.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus({ preventScroll: true });
  }, [step]);

  // 목적이 바뀌면 영양을 아직 손대지 않았을 때만 기본값으로 채운다.
  useEffect(() => {
    if (!focusTouched) setFocus(goals.length ? defaultFocus(goals) : []);
  }, [goals, focusTouched]);

  const canNext =
    step === 0 ? true
      : step === 1 ? goals.length > 0
        : step === 2 ? level != null
          : step === 3 ? focus.length > 0
            : step === 4 ? true
              : agree && focus.length > 0 && goals.length > 0 && level != null;

  const finish = () => {
    if (!canNext || !level) return;
    onSave({ v: 1, goals, level, focus, avoid, at: Date.now() });
  };
  const next = () => (step === LAST ? finish() : canNext && setStep(step + 1));

  if (!mounted) return null;
  return createPortal(
    <div className={`ui ${s.scrim}`} role="presentation" onMouseDown={(e) => dismissible && e.target === e.currentTarget && onClose()}>
      <div className={s.dialog} role="dialog" aria-modal="true" aria-labelledby="ob-title">
        {step > 0 ? (
          <header className={s.head}>
            <button type="button" className={s.iconBtn} onClick={() => setStep(step - 1)} aria-label="이전 단계">
              <Icon name="back" size={20} />
            </button>
            <ol className={s.progress} aria-label={`${STEPS.length}단계 중 ${step}단계`}>
              {STEPS.map((name, i) => (
                <li key={name} className={i < step ? s.done : undefined} aria-current={i + 1 === step ? 'step' : undefined}>
                  <span className="sr-only">{name}</span>
                </li>
              ))}
            </ol>
            {dismissible ? (
              <button type="button" className={s.iconBtn} onClick={onClose} aria-label="닫기">
                <Icon name="close" size={20} />
              </button>
            ) : (
              <span className={`${s.count} num`}>{step}/{STEPS.length}</span>
            )}
          </header>
        ) : null}

        <div className={s.body} ref={body}>
          {step === 0 ? <Welcome /> : null}
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
          {step === 0 ? (
            <button type="button" className="btn btn-primary btn-lg btn-block" onClick={() => setStep(1)} data-autofocus>
              내 기준 만들기
            </button>
          ) : (
            <>
              {step === 4 ? (
                <p className={`tiny faint ${s.footNote}`}>{avoid.length ? `${avoid.length}개 선택` : '없으면 그냥 넘어가도 됩니다'}</p>
              ) : step === 3 ? (
                <p className={`tiny faint ${s.footNote} num`}>{focus.length}/{MAX_FOCUS} 선택</p>
              ) : (
                <span />
              )}
              <button type="button" className="btn btn-primary btn-lg" onClick={next} disabled={!canNext}>
                {step === LAST ? (initial ? '저장하기' : '내 기준으로 시작하기') : '다음'}
              </button>
            </>
          )}
        </footer>
      </div>
    </div>,
    document.body,
  );
}

// ── 0. 시작 ──────────────────────────────────────────────────────────────

function Welcome() {
  return (
    <div className={s.welcome}>
      <p className={s.mark} aria-hidden>
        <LogoMark size={36} />
        What&apos;s In?
      </p>
      <h2 id="ob-title" className={s.welcomeTitle}>
        제품마다
        <br />
        내가 보는 것부터
      </h2>
      <p className={`muted ${s.lead}`}>
        관심사를 알려 주시면 어떤 제품을 열어도 그것부터 답해 드립니다. 네 가지만 묻습니다.
      </p>
      <ul className={s.promise}>
        <li>
          <span className={`${s.promiseNum} num`}>1</span>
          <span>
            <b>들었나</b>
            <span className="muted">내가 피하는 성분이 있는지</span>
          </span>
        </li>
        <li>
          <span className={`${s.promiseNum} num`}>2</span>
          <span>
            <b>얼마나</b>
            <span className="muted">한 번 먹는 양에 당질, 열량, 단백질이 몇인지</span>
          </span>
        </li>
        <li>
          <span className={`${s.promiseNum} num`}>3</span>
          <span>
            <b>무엇을 더 볼지</b>
            <span className="muted">그 밖에 알아 둘 성분과 표시</span>
          </span>
        </li>
      </ul>
      <p className={`tiny faint ${s.fine}`}>관심사만 묻습니다. 검사 수치나 진단명은 받지 않습니다.</p>
    </div>
  );
}

// ── 1. 목적 ──────────────────────────────────────────────────────────────

function StepHead({ title, sub }: { title: string; sub: string }) {
  return (
    <div className={s.stepHead}>
      <h2 id="ob-title" className={s.stepTitle}>{title}</h2>
      <p className="muted small">{sub}</p>
    </div>
  );
}

function Goals({ goals, setGoals }: { goals: GoalId[]; setGoals: (g: GoalId[]) => void }) {
  const toggle = (id: GoalId) => {
    if (goals.includes(id)) setGoals(goals.filter((g) => g !== id));
    else setGoals(goals.length >= MAX_GOALS ? [...goals.slice(1), id] : [...goals, id]);
  };
  return (
    <>
      <StepHead title="무엇 때문에 성분표를 보시나요?" sub={`가장 가까운 것을 ${MAX_GOALS}개까지 고릅니다. 먼저 고른 것이 앞에 섭니다.`} />
      <div className={s.optionGrid}>
        {GOALS.map((g, i) => {
          const on = goals.includes(g.id);
          const order = goals.indexOf(g.id) + 1;
          return (
            <button key={g.id} type="button" className={s.option} aria-pressed={on} onClick={() => toggle(g.id)} data-autofocus={i === 0 ? true : undefined}>
              <span className={s.optionTop}>
                <span className={s.optionLabel}>{g.label}</span>
                <span className={`${s.tick} num`} aria-hidden>{on ? order : ''}</span>
              </span>
              <span className={`small muted ${s.optionDesc}`}>{g.desc}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

// ── 2. 익숙한 정도 ───────────────────────────────────────────────────────

function Levels({ level, setLevel }: { level: Level | null; setLevel: (l: Level) => void }) {
  return (
    <>
      <StepHead title="성분표 보는 게 얼마나 익숙하세요?" sub="설명을 얼마나 붙일지 정합니다. 나중에 바꿀 수 있습니다." />
      <div className={s.list} role="radiogroup" aria-label="익숙한 정도">
        {LEVELS.map((l, i) => (
          <button
            key={l.id}
            type="button"
            role="radio"
            aria-checked={level === l.id}
            className={s.row}
            onClick={() => setLevel(l.id)}
            data-autofocus={i === 0 ? true : undefined}
          >
            <span className={s.radio} aria-hidden />
            <span className={s.rowText}>
              <span className={s.optionLabel}>{l.label}</span>
              <span className="small muted">{l.desc}</span>
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

// ── 3. 먼저 볼 영양 ──────────────────────────────────────────────────────

function Focus({ focus, setFocus, reset, level }: { focus: NutrientKey[]; setFocus: (f: NutrientKey[]) => void; reset: () => void; level: Level | null }) {
  const toggle = (k: NutrientKey) => {
    if (focus.includes(k)) setFocus(focus.filter((x) => x !== k));
    else if (focus.length < MAX_FOCUS) setFocus([...focus, k]);
  };
  const full = focus.length >= MAX_FOCUS;
  return (
    <>
      <StepHead title="제품마다 가장 먼저 볼 숫자" sub={`${MAX_FOCUS}개까지 고릅니다. 고른 순서대로 제품 맨 위에 놓입니다. 하나만 골라도 됩니다.`} />
      <div className={s.nutGrid}>
        {NUTRIENT_ORDER.map((k, i) => {
          const n = NUTRIENTS[k];
          const order = focus.indexOf(k) + 1;
          const on = order > 0;
          return (
            <button
              key={k}
              type="button"
              className={s.nut}
              aria-pressed={on}
              disabled={!on && full}
              onClick={() => toggle(k)}
              data-autofocus={i === 0 ? true : undefined}
            >
              <span className={s.nutTop}>
                <span className={s.optionLabel}>{n.label}</span>
                <span className={`${s.tick} num`} aria-hidden>{on ? order : ''}</span>
              </span>
              {level !== 'own' ? <span className={`tiny muted ${s.nutDesc}`}>{n.desc}</span> : null}
            </button>
          );
        })}
      </div>
      <button type="button" className={`btn btn-quiet btn-sm ${s.resetBtn}`} onClick={reset}>
        목적에 맞게 다시 고르기
      </button>
    </>
  );
}

// ── 4. 피할 성분 ─────────────────────────────────────────────────────────

function Avoid({ avoid, setAvoid, goals }: { avoid: AvoidItem[]; setAvoid: (a: AvoidItem[]) => void; goals: GoalId[] }) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [loading, setLoading] = useState(false);
  const has = (k: string) => avoid.some((a) => a.k === k);
  const add = (a: AvoidItem) => !has(a.k) && avoid.length < MAX_AVOID && setAvoid([...avoid, a]);
  const remove = (k: string) => setAvoid(avoid.filter((a) => a.k !== k));
  const toggle = (a: AvoidItem) => (has(a.k) ? remove(a.k) : add(a));

  const suggested = useMemo(() => new Set(suggestedAvoid(goals)), [goals]);
  // 조사에서 많이 나온 것은 언급 순서 그대로(목적 추천은 배지만) · 그 밖은 접어 둔다(골라 둔 것이 있으면 펼친다).
  const top = AVOID_PRESETS.filter((p) => p.top);
  const more = AVOID_PRESETS.filter((p) => !p.top);
  const [showMore, setShowMore] = useState(() => more.some((p) => avoid.some((a) => a.k === p.k)));
  const pick = (p: AvoidPreset) => toggle(p.ks ? { k: p.k, l: p.l, t: p.t, ks: p.ks } : { k: p.k, l: p.l, t: p.t });
  const presetList = (xs: AvoidPreset[]) => (
    <ul className={s.presetGrid}>
      {xs.map((p) => (
        <li key={p.k}>
          <button type="button" className={s.preset} aria-pressed={has(p.k)} onClick={() => pick(p)}>
            <span className={s.presetTop}>
              <span className="strong">{p.l}</span>
              {suggested.has(p.k) && !has(p.k) ? <span className={s.suggest}>추천</span> : null}
              {has(p.k) ? <Icon name="check" size={16} /> : null}
            </span>
            {p.hint ? <span className="tiny faint">{p.hint}</span> : null}
          </button>
        </li>
      ))}
    </ul>
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
    <>
      <StepHead title="피하고 싶은 성분이 있나요?" sub="제품을 열면 이 성분이 들었는지 가장 먼저 알려 드립니다. 없으면 넘어가도 됩니다." />

      {/* 고른 성분 — 한 줄 자리를 늘 둔다(고를 때마다 아래가 밀리지 않게 · 넘치면 옆으로 넘긴다) */}
      <ul className={s.picked} aria-label="고른 성분">
        {avoid.length ? (
          avoid.map((a) => (
            <li key={a.k}>
              <button type="button" className="chip chip-mine" onClick={() => remove(a.k)} aria-label={`${a.l} 빼기`}>
                {a.l}
                <Icon name="close" size={14} />
              </button>
            </li>
          ))
        ) : (
          <li className={`small faint ${s.pickedEmpty}`}>아직 고른 성분이 없습니다</li>
        )}
      </ul>

      <div className={s.searchWrap}>
      <label className={s.search}>
        <Icon name="search" size={18} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="성분 이름으로 찾기 (예: 수크랄로스)"
          aria-label="성분 이름으로 찾기"
          data-autofocus
        />
        <button type="button" className={s.clear} onClick={() => setQ('')} aria-label="지우기" tabIndex={q ? 0 : -1} style={q ? undefined : { visibility: 'hidden' }}>
          <Icon name="close" size={16} />
        </button>
      </label>

      {hits !== null ? (
        <div className={s.results} aria-live="polite">
          {loading && !hits.length ? <p className="small faint">찾는 중</p> : null}
          {!loading && hits.length === 0 ? <p className="small faint">사전에 없는 이름입니다. 다른 표기로 찾아 보세요.</p> : null}
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

      <div className={s.groupHead}>
        <p className="eyebrow">사람들이 많이 피하는 성분</p>
        <p className="tiny faint">커뮤니티에서 자주 묻고 피하는 순서입니다</p>
      </div>
      {presetList(top)}
      {showMore ? (
        <>
          <p className={`eyebrow ${s.groupHead}`}>그 밖의 성분</p>
          {presetList(more)}
        </>
      ) : (
        <button type="button" className={`btn btn-quiet btn-sm ${s.resetBtn}`} onClick={() => setShowMore(true)}>
          <Icon name="down" size={16} />그 밖의 성분 {more.length}개 더 보기
        </button>
      )}
      <p className={`tiny faint ${s.fine}`}>
        알레르기는 여기서 거르지 않습니다. 저희 자료의 알레르기 표시는 일부뿐이라, 포장의 알레르기 표시를 꼭 함께 확인해 주세요.
      </p>
    </>
  );
}

// ── 5. 확인과 동의 ───────────────────────────────────────────────────────

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
  const rows: { step: number; name: string; value: React.ReactNode }[] = [
    { step: 1, name: '목적', value: goals.map((g) => GOALS.find((x) => x.id === g)?.label).join(', ') || '고르지 않음' },
    { step: 2, name: '익숙한 정도', value: LEVELS.find((l) => l.id === level)?.label ?? '고르지 않음' },
    {
      step: 3,
      name: '먼저 볼 영양',
      value: (
        <span className={s.reviewChips}>
          {focus.map((k, i) => (
            <span key={k} className="chip chip-mine">
              <span className="num">{i + 1}</span> {NUTRIENTS[k].label}
            </span>
          ))}
        </span>
      ),
    },
    {
      step: 4,
      name: '피할 성분',
      value: avoid.length ? (
        <span className={s.reviewChips}>
          {avoid.map((a) => (
            <span key={a.k} className="chip">{a.l}</span>
          ))}
        </span>
      ) : (
        '없음'
      ),
    },
  ];
  return (
    <>
      <StepHead title={editing ? '내 기준' : '이렇게 보여 드릴게요'} sub="누르면 그 단계로 돌아가 고칠 수 있습니다." />
      <div className={s.review}>
        {rows.map((r) => (
          <button key={r.step} type="button" className={s.reviewRow} onClick={() => go(r.step)}>
            <span className={`small faint ${s.reviewName}`}>{r.name}</span>
            <span className={s.reviewValue}>{r.value}</span>
            <Icon name="next" size={18} className={s.reviewArrow} />
          </button>
        ))}
      </div>

      <div className={s.notice}>
        <p className="small">
          와츠인은 포장에 표시된 영양성분과 원재료를 공표 기준과 견주어 보여 드립니다. 의료 진단이나 치료를 대신하지 않으며, 「먹어도 된다」고 판단해 드리지 않습니다.
        </p>
        <p className="small muted">
          고른 관심사는 계정이 아니라 이 브라우저에 저장됩니다. 제품을 열 때 피할 성분 목록만 함께 보내 원재료와 맞춰 봅니다.
        </p>
      </div>
      <label className={s.agree}>
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} data-autofocus />
        <span className={s.box} aria-hidden>
          <Icon name="check" size={14} />
        </span>
        <span className="small">관심사를 이 브라우저에 저장하는 데 동의합니다 (필수)</span>
      </label>
      {editing ? (
        <button type="button" className={`btn btn-quiet btn-sm ${s.resetBtn}`} onClick={onReset}>
          기준을 지우고 처음부터
        </button>
      ) : null}
    </>
  );
}
