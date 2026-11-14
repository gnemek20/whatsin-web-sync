'use client';
// 비교 — 2026-11-13 사용자 「담는 게 아니라, 제품을 보다가 "이 제품이랑 저건 어떻지?" 하며 자연스럽게」.
// 별도 탭 · 담기 막대 없이, 상세 화면 위에 창을 띄워 지금 제품과 나란히 본다. 창 안에서 더 고르면 1:N(최대 4).
//   여는 곳 — 왼쪽 단 「다른 제품과 비교」 · 다른 선택 · 비슷한 상품 카드의 「비교」 · 주소 ?vs=id,id(공유 링크).
//   후보 — 다른 선택 · 비슷한 상품(/api/product/[id]/related) · 최근 본 제품(이 브라우저) · 이름 검색(/api/suggest).
// 숫자만 나란히 적는다 — 「어느 쪽이 낫다」 표시는 하지 않는다(사용자 「수치를 명시하는 방향」 · 기준점은 나중에).
// 레이아웃 고정 — 창은 떠 있다(position: fixed) · 스크롤 잠금은 html 의 scrollbar-gutter 가 막대 자리를 지킨다.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import type { ProductDetail } from '@/lib/types';
import { NUTRIENTS, type Lens, type NutrientKey } from '@/lib/lens';
import { amountOf, avoidCheck, basisOf, per100Label, polyolIngredients, type Mode } from '@/lib/facts';
import { recentViews } from '@/lib/recents';
import { subLine } from '@/lib/format';
import { FoodTile } from '../FoodTile';
import { Icon } from '../Icon';
import s from './compare.module.css';

const MAX = 4;
type Cand = { id: string; name: string; brand: string; sub: string; image_url?: string | null; from: string };
type Ctx = { open: (id?: string) => void };
const CompareCtx = createContext<Ctx | null>(null);

export function CompareProvider({ base, lens, initial, children }: { base: ProductDetail; lens: Lens | null; initial: string[]; children: React.ReactNode }) {
  const [ids, setIds] = useState<string[]>(initial.filter((x) => x !== base.id).slice(0, MAX - 1));
  const [isOpen, setOpen] = useState(initial.length > 0);
  const open = useCallback((id?: string) => {
    if (id && id !== base.id) setIds((xs) => (xs.includes(id) ? xs : [...xs, id].slice(-(MAX - 1))));
    setOpen(true);
  }, [base.id]);
  // 주소에 비교 상태를 남긴다(공유 · 새로 고침) — 창을 닫으면 지운다
  useEffect(() => {
    const u = new URL(location.href);
    if (isOpen && ids.length) u.searchParams.set('vs', ids.join(','));
    else u.searchParams.delete('vs');
    history.replaceState(history.state, '', u.toString());
  }, [isOpen, ids]);
  const value = useMemo(() => ({ open }), [open]);
  return (
    <CompareCtx.Provider value={value}>
      {children}
      {isOpen ? <CompareSheet base={base} lens={lens} ids={ids} setIds={setIds} onClose={() => setOpen(false)} /> : null}
    </CompareCtx.Provider>
  );
}

/** 왼쪽 단의 큰 단추 */
export function CompareOpenButton() {
  const c = useContext(CompareCtx);
  if (!c) return null;
  return (
    <button type="button" className={`btn btn-ghost btn-block ${s.openBtn}`} onClick={() => c.open()}>
      <Icon name="compare" size={18} />
      다른 제품과 비교
    </button>
  );
}

/** 대안 · 비슷한 상품 카드 위의 작은 단추 — 비교 창이 없는 화면에서는 그리지 않는다 */
export function CompareChip({ id, name }: { id: string; name: string }) {
  const c = useContext(CompareCtx);
  if (!c) return null;
  return (
    <button type="button" className={s.chip} onClick={() => c.open(id)} aria-label={`${name}와 비교`}>
      <Icon name="compare" size={16} />
      비교
    </button>
  );
}

// ── 창 ─────────────────────────────────────────────────────────────────

function CompareSheet({ base, lens, ids, setIds, onClose }: { base: ProductDetail; lens: Lens | null; ids: string[]; setIds: (f: (xs: string[]) => string[]) => void; onClose: () => void }) {
  const [mode, setMode] = useState<Mode>('serving');
  const [got, setGot] = useState<Record<string, ProductDetail | 'loading' | 'fail'>>({});
  const [picking, setPicking] = useState(ids.length === 0);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', k);
    };
  }, [onClose]);
  useEffect(() => {
    for (const id of ids) {
      if (got[id]) continue;
      setGot((g) => ({ ...g, [id]: 'loading' }));
      fetch(`/api/product/${encodeURIComponent(id)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => setGot((g) => ({ ...g, [id]: d ?? 'fail' })))
        .catch(() => setGot((g) => ({ ...g, [id]: 'fail' })));
    }
  }, [ids, got]);

  const cols: (ProductDetail | 'loading' | 'fail')[] = [base, ...ids.map((id) => got[id] ?? 'loading')];
  const add = (c: Cand) => {
    setIds((xs) => (xs.includes(c.id) || c.id === base.id ? xs : [...xs, c.id].slice(0, MAX - 1)));
    setPicking(false);
  };
  const remove = (id: string) => setIds((xs) => xs.filter((x) => x !== id));

  if (!mounted) return null;
  return createPortal(
    <div className={`ui ${s.scrim}`} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={s.sheet} role="dialog" aria-modal="true" aria-labelledby="cmp-h">
        <header className={s.head}>
          <div className={s.headText}>
            <h2 id="cmp-h" className="t-headline">비교</h2>
            <p className="t-caption c-t3">「{base.name}」와 나란히 봅니다. {MAX}개까지 견줄 수 있습니다.</p>
          </div>
          <div className={s.seg} role="group" aria-label="기준">
            <button type="button" aria-pressed={mode === 'serving'} onClick={() => setMode('serving')}>1회분</button>
            <button type="button" aria-pressed={mode === 'per100'} onClick={() => setMode('per100')}>100g(mL)당</button>
          </div>
          <button type="button" className={s.x} onClick={onClose} aria-label="닫기"><Icon name="close" size={20} /></button>
        </header>

        <div className={`scroll-y ${s.body}`}>
          <CompareTable cols={cols} lens={lens} mode={mode} onRemove={remove} baseId={base.id}
            addSlot={cols.length < MAX ? (
              picking ? <Picker baseId={base.id} taken={[base.id, ...ids]} onPick={add} onCancel={ids.length ? () => setPicking(false) : undefined} /> : (
                <button type="button" className={s.addBtn} onClick={() => setPicking(true)}>
                  <Icon name="plus" size={20} />
                  <span className="t-strong">제품 더하기</span>
                  <span className="t-caption c-t3">다른 선택, 최근 본 제품, 이름으로</span>
                </button>
              )
            ) : null}
          />
          <p className={`t-caption c-t3 ${s.foot}`}>
            {mode === 'serving' ? '제품마다 1회분이 다를 수 있습니다. 같은 양으로 보려면 100g(mL)당을 고르세요. ' : ''}
            기준치는 식약처 1일 영양성분 기준치 대비입니다. 「목록에 없음」은 원재료 목록에서 찾지 못했다는 뜻입니다.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── 후보 고르기(표의 마지막 칸 자리에서) ─────────────────────────────────

function Picker({ baseId, taken, onPick, onCancel }: { baseId: string; taken: string[]; onPick: (c: Cand) => void; onCancel?: () => void }) {
  const [rel, setRel] = useState<Cand[] | null>(null);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Cand[]>([]);
  const recent = useMemo<Cand[]>(
    () => recentViews().filter((r) => r.id !== baseId).slice(0, 6).map((r) => ({ id: r.id, name: r.name, brand: r.brand, sub: r.sub, image_url: r.image_url, from: '최근 본 제품' })),
    [baseId],
  );
  useEffect(() => {
    fetch(`/api/product/${encodeURIComponent(baseId)}/related`).then((r) => (r.ok ? r.json() : [])).then(setRel).catch(() => setRel([]));
  }, [baseId]);
  useEffect(() => {
    const t = q.trim();
    if (!t) { setHits([]); return; }
    const ctl = new AbortController();
    const id = window.setTimeout(async () => {
      try {
        const r = await fetch(`/api/suggest?q=${encodeURIComponent(t)}`, { signal: ctl.signal });
        if (r.ok) setHits(((await r.json()) as Cand[]).map((x) => ({ ...x, from: '검색' })));
      } catch {}
    }, 160);
    return () => { ctl.abort(); window.clearTimeout(id); };
  }, [q]);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus({ preventScroll: true }), []);
  const list = (q.trim() ? hits : [...(rel ?? []), ...recent]).filter((c, i, xs) => !taken.includes(c.id) && xs.findIndex((x) => x.id === c.id) === i).slice(0, 10);
  return (
    <div className={s.picker}>
      <label className={s.pickSearch}>
        <Icon name="search" size={16} />
        <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="제품 이름으로 찾기" aria-label="비교할 제품 찾기" />
      </label>
      <ul className={`scroll-y ${s.pickList}`}>
        {rel === null && !q ? <li className="t-caption c-t3">후보를 불러오는 중</li> : null}
        {list.map((c) => (
          <li key={c.id}>
            <button type="button" onClick={() => onPick(c)} className={s.pickRow}>
              <span className="t-strong">{c.name}</span>
              <span className="t-caption c-t3">{c.from}, {subLine(c.brand, c.sub)}</span>
            </button>
          </li>
        ))}
        {list.length === 0 && (rel !== null || q) ? <li className="t-caption c-t3">{q ? '맞는 제품이 없습니다' : '후보가 없습니다. 이름으로 찾아 보세요.'}</li> : null}
      </ul>
      {onCancel ? <button type="button" className={`t-caption ${s.cancel}`} onClick={onCancel}>닫기</button> : null}
    </div>
  );
}

// ── 표 ─────────────────────────────────────────────────────────────────

const OTHERS: NutrientKey[] = ['kcal', 'carb', 'carb_net', 'sugar', 'polyol', 'protein', 'fat', 'sodium', 'fiber'];
const plainText = (t?: string | null) => (t ?? '').replace(/\*\*/g, '').replace(/\$[^$]*\$/g, '').split('\n')[0];

function CompareTable({ cols, lens, mode, onRemove, baseId, addSlot }: {
  cols: (ProductDetail | 'loading' | 'fail')[]; lens: Lens | null; mode: Mode; onRemove: (id: string) => void; baseId: string; addSlot: React.ReactNode;
}) {
  const focus = lens?.focus ?? [];
  const ready = cols.filter((c): c is ProductDetail => typeof c === 'object');
  const others = OTHERS.filter((k) => !focus.includes(k) && (k !== 'polyol' || ready.some((d) => d.axes?.glycemic?.polyol_g != null || polyolIngredients(d).length)));
  const n = cols.length + (addSlot ? 1 : 0);

  const cell = (c: ProductDetail | 'loading' | 'fail', render: (d: ProductDetail) => React.ReactNode, key: string | number) =>
    typeof c === 'object' ? <td key={key}>{render(c)}</td> : <td key={key}><span className="skel" style={{ display: 'block', height: 18, width: '60%' }} /></td>;
  const value = (d: ProductDetail, k: NutrientKey) => {
    const a = amountOf(d, k, mode);
    const fell = mode === 'serving' && basisOf(d).kind === 'per100';
    return (
      <>
        {a.value == null ? <span className="c-t3">{a.missing}</span> : <span className={`num ${s.v}`}>{a.text}</span>}
        <span className={`t-micro c-t3 ${s.sub}`}>{a.value != null && a.dailyPct != null ? `기준치 ${Math.round(a.dailyPct)}%` : fell && a.value != null ? '100g(mL)당' : ' '}</span>
      </>
    );
  };
  const filler = addSlot ? <td aria-hidden /> : null;

  return (
    <div className={s.scroller}>
      <table className={s.table} style={{ ['--n' as string]: n }}>
        <thead>
          <tr>
            <th scope="col" className={s.corner}><span className="visually-hidden">항목</span></th>
            {cols.map((c, i) => (
              <th key={i} scope="col" className={s.colHead}>
                {typeof c === 'object' ? (
                  <>
                    <div className={s.colTop}>
                      <FoodTile type={c.sub} src={c.image_url} size={44} />
                      {c.id === baseId ? <span className={`t-micro ${s.baseTag}`}>지금 보는 제품</span> : (
                        <button type="button" className={s.remove} onClick={() => onRemove(c.id)} aria-label={`${c.name} 빼기`}><Icon name="close" size={16} /></button>
                      )}
                    </div>
                    {c.id === baseId ? <span className={`t-strong ${s.colName}`}>{c.name}</span> : <Link href={`/p/${c.id}`} className={`t-strong ${s.colName}`}>{c.name}</Link>}
                    <span className={`t-caption c-t3 ${s.colSub}`}>{subLine(c.brand, c.sub)}</span>
                    <span className={`t-micro ${s.colBasis}`}>{mode === 'serving' ? basisOf(c).label : per100Label(basisOf(c))}</span>
                  </>
                ) : (
                  <div className={s.colLoading}>
                    <span className="skel" style={{ width: 44, height: 44, borderRadius: 12 }} />
                    <span className="skel" style={{ height: 18, width: '80%' }} />
                    <span className="t-caption c-t3">{c === 'fail' ? '불러오지 못했습니다' : '불러오는 중'}</span>
                  </div>
                )}
              </th>
            ))}
            {addSlot ? <th scope="col" rowSpan={1} className={s.addHead}>{addSlot}</th> : null}
          </tr>
        </thead>
        <tbody>
          {lens ? (
            <>
              <tr className={`${s.group} ${s.groupMine}`}><th scope="rowgroup" colSpan={n + 1}>내 기준</th></tr>
              {focus.map((k, i) => (
                <tr key={k} className={s.mine}>
                  <th scope="row"><span className={`num ${s.rank}`}>{i + 1}</span>{NUTRIENTS[k].label}</th>
                  {cols.map((c, ci) => cell(c, (d) => value(d, k), ci))}
                  {filler}
                </tr>
              ))}
              {lens.avoid.map((a) => (
                <tr key={a.k} className={s.mine}>
                  <th scope="row">{a.l}<span className={`t-micro c-t3 ${s.sub}`}>피할 성분</span></th>
                  {cols.map((c, ci) => cell(c, (d) => {
                    const chk = avoidCheck(d, lens.avoid);
                    const r = chk.results.find((x) => x.item.k === a.k);
                    if (chk.noIngredients) return <span className="c-t3">원재료 정보 없음</span>;
                    return r && r.hits.length ? (
                      <>
                        <span className="chip chip-hit" style={{ height: 24 }}>들어 있음</span>
                        <span className={`t-micro c-t3 ${s.sub}`}>{r.hits.map((h) => h.ing.name).join(', ')}</span>
                      </>
                    ) : (
                      <><span className="c-t3">목록에 없음</span><span className={`t-micro ${s.sub}`}>{' '}</span></>
                    );
                  }, ci))}
                  {filler}
                </tr>
              ))}
            </>
          ) : null}

          <tr className={s.group}><th scope="rowgroup" colSpan={n + 1}>영양성분</th></tr>
          {others.map((k) => (
            <tr key={k}>
              <th scope="row">{NUTRIENTS[k].label}</th>
              {cols.map((c, ci) => cell(c, (d) => value(d, k), ci))}
              {filler}
            </tr>
          ))}

          <tr className={s.group}><th scope="rowgroup" colSpan={n + 1}>원재료</th></tr>
          <tr>
            <th scope="row">원재료 수</th>
            {cols.map((c, ci) => cell(c, (d) => {
              const chk = avoidCheck(d, []);
              return (<><span className={`num ${s.v}`}>{d.ingredients.length || '-'}</span><span className={`t-micro c-t3 ${s.sub}`}>{chk.unknown ? `세부 미확인 ${chk.unknown}` : ' '}</span></>);
            }, ci))}
            {filler}
          </tr>
          <tr>
            <th scope="row">감미료</th>
            {cols.map((c, ci) => cell(c, (d) => {
              const xs = d.ingredients.filter((i) => i.tag === '감미료' || i.function_classes?.includes('감미료'));
              return xs.length ? <span className="t-caption">{xs.map((i) => i.name).join(', ')}</span> : <span className="t-caption c-t3">없음</span>;
            }, ci))}
            {filler}
          </tr>
          <tr>
            <th scope="row">주의 성분</th>
            {cols.map((c, ci) => cell(c, (d) => (d.flagged.length ? <span className="t-caption">{d.flagged.map((i) => i.name).join(', ')}</span> : <span className="t-caption c-t3">없음</span>), ci))}
            {filler}
          </tr>

          <tr className={s.group}><th scope="rowgroup" colSpan={n + 1}>자세한 평가</th></tr>
          {(['nutrition', 'ingredient', 'glycemic'] as const).map((key) => (
            <tr key={key}>
              <th scope="row">{key === 'nutrition' ? '영양 균형' : key === 'ingredient' ? '원재료' : '당질'}</th>
              {cols.map((c, ci) => cell(c, (d) => <span className="t-caption">{d.axes ? plainText(d.axes[key].label) : '-'}</span>, ci))}
              {filler}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
