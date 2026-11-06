'use client';
// 바코드 원정대(whatsin.kr/collect · 주소로만 들어오는 수집 페이지 · 2026-11-03 사용자).
// 사진 넷 → 서버가 두 모델로 읽어 칸을 채움 → 업로더가 고쳐 제출 → 한 건 500원(모든 수집가 합쳐 300건까지).
// 흐름 · 규칙의 정본은 서버(backend/app/api/routers/collect.py) — 여기는 보여 주기와 미리 막기만.
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  AMOUNTS, api, CollectError, gtinValid, IDENT, MAX_PER_SLOT, NUTRIENTS, shrink, SLOTS, thumbUrl, whenKo, won,
  type BarcodeStatus, type Board, type Cap, type Collector, type MineDetail, type NutKey, type Read, type Slot,
} from '@/lib/collect';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AlbumGlyph, CameraGlyph, Coin, Crown, Mascot, SlotArt } from './art';
import s from './collect.module.css';

const SLOT_INFO: Record<Slot, { title: string; hint: string }> = {
  front: { title: '앞면', hint: '썸네일용' },
  label: { title: '표기면', hint: '원재료, 영양성분 있는 면' },
  barcode: { title: '바코드', hint: '숫자까지 쨍하게' },
};

// 칸마다 사진 여러 장(최대 5 · 2026-11-03 저녁 사용자) — 표기면이 한 장에 안 담긴다. 판독은 그 칸 사진 전부를 한 번에(서버 /read).
type Shot = { key: string; status: 'uploading' | 'done' | 'error'; preview: string; photoId?: string; error?: string };
type SlotState = { shots: Shot[]; reading: boolean; readId?: string; read?: Read; readOf?: string; failed?: boolean; hist?: string[] }; // failed = 판독을 못 받았다(「다시 읽기」를 보인다)
// hist = 그 칸에서 받은 판독 id 전부(오래된 것 → 최신). 사진을 더해 다시 읽으면 빈칸만 채워 이미 든 값은 앞 판독 값이다 —
// 제출 때 기록을 다 보내야 서버가 그 값을 「사람이 고친 칸」으로 세지 않는다(2026-11-06 사용자).
const histOf = (st: SlotState) => st.hist ?? (st.readId ? [st.readId] : []);
const READ_HISTORY = 20; // 서버 routers/collect.READ_HISTORY 와 같다
const slotReady = (st: SlotState) => st.shots.some((x) => x.status === 'done') && !!st.read && !st.reading && !st.shots.some((x) => x.status === 'uploading');
// 칸 — 수집 안내서 ①제품 식별 ②원재료 ③영양성분 ④양(서버 routers/collect.Fields). 바코드만 바코드 사진, 나머지는 전부 표기면에서 읽는다.
type FieldKey =
  | 'name' | 'barcode' | (typeof IDENT)[number]['key'] | 'ingredients' | 'basis' | NutKey | 'fiber_g' | 'sugar_alcohols' | 'others'
  | 'total_content' | 'total_unit' | 'serving_size' | 'serving_unit' | 'servings_per_container';
type Fields = Record<FieldKey, string>;

const ALL_KEYS: FieldKey[] = [
  'name', 'barcode', ...IDENT.map((x) => x.key), 'ingredients', 'basis', ...NUTRIENTS.map((n) => n.key), 'fiber_g', 'sugar_alcohols', 'others',
  'total_content', 'total_unit', 'serving_size', 'serving_unit', 'servings_per_container',
];
const EMPTY_FIELDS = Object.fromEntries(ALL_KEYS.map((k) => [k, ''])) as Fields;
const EMPTY_SLOT = (): SlotState => ({ shots: [], reading: false });
const EMPTY_PHOTOS = (): Record<Slot, SlotState> => ({ front: EMPTY_SLOT(), label: EMPTY_SLOT(), barcode: EMPTY_SLOT() });
const SLOT_OF = Object.fromEntries(ALL_KEYS.map((k) => [k, k === 'barcode' ? 'barcode' : 'label'])) as Record<FieldKey, Slot>;
const LABEL: Record<FieldKey, string> = {
  name: '제품명', barcode: '바코드', ingredients: '원재료명', basis: '표시 기준', fiber_g: '식이섬유', sugar_alcohols: '당알코올', others: '기타',
  total_content: '총 내용량', total_unit: '단위', serving_size: '1회 제공량', serving_unit: '단위', servings_per_container: '몇 회분',
  ...Object.fromEntries(IDENT.map((x) => [x.key, x.label])),
  ...Object.fromEntries(NUTRIENTS.map((n) => [n.key, n.label])),
} as Record<FieldKey, string>;
// 숫자 칸 — 숫자 또는 「-」
const NUMERIC: FieldKey[] = [...NUTRIENTS.map((n) => n.key), 'fiber_g', 'total_content', 'serving_size', 'servings_per_container'];
const DRAFT_KEY = 'wi_collect_draft';

// 「-」 = 라벨에 적혀 있지 않음 = 값 없음(2026-11-03 사용자). 필수(제품 이름 · 바코드)가 아닌 칸은 비워도 제출할 때 「-」가 된다.
const DASH = '-';
const OPTIONAL: FieldKey[] = ALL_KEYS.filter((k) => k !== 'name' && k !== 'barcode');
const isDash = (v: string) => v.trim() === DASH;
const num = (v: string) => v.trim() !== '' && Number.isFinite(Number(v.replace(/,/g, '')));
const TABS = ['quest', 'mine', 'rank'] as const;
// 바코드는 사진 한 장만(2026-11-06 사용자 「바코드는 이미지 단독 · 새로 올리면 바뀌는 수밖에」) — 새로 찍거나 고르면 앞 사진을 바꾼다
const maxOf = (slot: Slot) => (slot === 'barcode' ? 1 : MAX_PER_SLOT);
const toStr = (v: unknown) => (v === null || v === undefined ? '' : String(v));

// 고치기(2026-11-06 사용자 「이미 제출한 걸 고치고 싶다」) — 내 제출을 같은 입력 화면에 다시 채운다.
// 사람이 고쳤던 칸(판독 값과 다른 칸)은 「고친 칸」으로 두어 사진을 바꿔 다시 읽어도 덮지 않는다.
function seedFields(d: MineDetail): Fields {
  const f = { ...EMPTY_FIELDS };
  const put = (k: FieldKey, v: unknown) => { f[k] = toStr(v); };
  put('name', d.name);
  put('barcode', d.barcode);
  IDENT.forEach((x) => put(x.key, d[x.key]));
  put('ingredients', d.ingredients);
  const n = d.nutrition ?? {};
  (['basis', ...NUTRIENTS.map((x) => x.key), 'fiber_g', 'sugar_alcohols', 'others'] as FieldKey[]).forEach((k) => put(k, n[k]));
  const a = d.amounts ?? {};
  (['total_content', 'total_unit', 'serving_size', 'serving_unit', 'servings_per_container'] as FieldKey[]).forEach((k) => put(k, a[k]));
  // 글 칸의 「-」를 둘로 가른다(2026-11-06 사용자) — 비운 채 낸 글 칸은 「-」로 저장돼 돌아오는데(숫자 칸은 null 이라 빈칸),
  // 그대로 두면 「라벨에 없음」으로 적은 칸처럼 사진을 더해도 안 채워진다.
  // · 판독이 못 읽어 「-」가 된 칸 → 빈칸으로 연다(X 없음 · 사진을 더하면 채운다 · 그대로 내면 다시 「-」)
  // · 판독한 값을 사람이 지우고 「-」로 바꾼 칸(서버 edits 의 submitted 「-」) → 「-」 그대로(의도적으로 비운 칸 · 채우지 않는다)
  const wiped = Array.isArray(d.edits)
    ? new Set(d.edits.filter((e) => isDash(toStr(e.submitted))).map((e) => e.field))
    : null;
  for (const k of ALL_KEYS) {
    if (!isDash(f[k])) continue;
    const readV = toStr(d.photos?.[SLOT_OF[k]]?.read?.values?.[k]).trim();
    const keep = wiped ? wiped.has(k) : !!readV && !isDash(readV); // edits 가 없는 옛 제출은 마지막 판독으로 가른다
    if (!keep) f[k] = '';
  }
  return f;
}
async function seedPhotos(d: MineDetail): Promise<Record<Slot, SlotState>> {
  const next = EMPTY_PHOTOS();
  for (const slot of SLOTS) {
    const p = d.photos?.[slot];
    const ids = (p?.ids?.length ? p.ids : p?.id ? [p.id] : []).slice(0, maxOf(slot));
    if (!ids.length) continue;
    next[slot] = {
      shots: await Promise.all(ids.map(async (id) => ({ key: id, status: 'done' as const, photoId: id, preview: await thumbUrl(id) }))),
      reading: false, readId: d.read_ids?.[slot], read: p?.read ?? undefined, readOf: ids.join(','), failed: !p?.read,
      hist: d.read_history?.[slot] ?? undefined,
    };
  }
  return next;
}
// 고친 칸 = 서버가 제출 때 센 「사람이 고친 칸」(edits · 앞 판독 기록까지 맞대 본 것). 그것이 없는 옛 제출만 마지막 판독과 맞댄다.
function seedTouched(d: MineDetail, f: Fields): Set<FieldKey> {
  if (Array.isArray(d.edits)) return new Set(d.edits.map((e) => e.field as FieldKey).filter((k) => ALL_KEYS.includes(k)));
  const t = new Set<FieldKey>();
  for (const k of ALL_KEYS) {
    const v = d.photos?.[SLOT_OF[k]]?.read?.values?.[k];
    if (f[k] && toStr(v) !== f[k]) t.add(k);
  }
  return t;
}

export function Collect() {
  const [phase, setPhase] = useState<'loading' | 'join' | 'ready' | 'offline'>('loading');
  const [me, setMe] = useState<Collector | null>(null);
  const [cap, setCap] = useState<Cap | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]>('quest');
  const [slide, setSlide] = useState<'L' | 'R' | null>(null);
  const touch = useRef<{ x: number; y: number; t: number; skip: boolean } | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [toast, setToast] = useState<{ text: string; tone: 'ok' | 'bad' } | null>(null);
  const [party, setParty] = useState(0);
  const [editing, setEditing] = useState<MineDetail | null>(null);
  const toastT = useRef<number>();
  useEffect(() => () => window.clearTimeout(toastT.current), []);

  const say = useCallback((text: string, tone: 'ok' | 'bad' = 'ok') => {
    setToast({ text, tone });
    window.clearTimeout(toastT.current);
    toastT.current = window.setTimeout(() => setToast(null), 3200);
  }, []);

  // 내 기록 · 금액 — 탭을 바꿀 때만 받던 것을, 화면으로 돌아올 때 · 1분마다도 받는다(2026-11-06 사용자 「무효 처리한 건 금액도 빠져야」).
  // admin 이 무효 처리해 유효 건수가 줄면 알린다(내가 취소한 것은 그 자리에서 이미 알렸다 — selfDrop 으로 건너뛴다).
  const lastOk = useRef<{ n: number; won: number } | null>(null);
  const selfDrop = useRef(false);
  const loadBoard = useCallback(async () => {
    try {
      const b = await api.board();
      setBoard(b);
      setCap(b.cap);
      const now = b.me ? { n: b.me.count, won: b.me.earned_won } : null;
      const prev = lastOk.current;
      if (now && prev && now.n < prev.n && !selfDrop.current) {
        say(`무효 처리 ${prev.n - now.n}건, -${won(prev.won - now.won)}`, 'bad');
      }
      selfDrop.current = false;
      if (now) lastOk.current = now;
    } catch {}
  }, [say]);
  useEffect(() => {
    if (phase !== 'ready') return;
    const onShow = () => { if (document.visibilityState === 'visible') loadBoard(); };
    document.addEventListener('visibilitychange', onShow);
    window.addEventListener('focus', onShow);
    const t = window.setInterval(onShow, 60_000);
    return () => { document.removeEventListener('visibilitychange', onShow); window.removeEventListener('focus', onShow); window.clearInterval(t); };
  }, [phase, loadBoard]);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.whoami();
        setCap(r.cap);
        if (r.collector) {
          setMe(r.collector);
          setPhase('ready');
          loadBoard();
        } else setPhase('join');
      } catch {
        setPhase('offline');
      }
    })();
  }, [loadBoard]);

  // 한 건 금액은 제출 때 굳는다(이벤트 몫 포함) — 서버가 더한 값을 쓴다
  const earned = board?.me?.earned_won ?? 0;

  const go = (k: (typeof TABS)[number]) => {
    if (k === tab) return;
    if (k !== 'quest') setEditing(null); // 고치다가 다른 탭으로 가면 고치기를 접는다(하던 새 제출 초안은 그대로)
    setSlide(TABS.indexOf(k) > TABS.indexOf(tab) ? 'L' : 'R');
    setTab(k);
    if (k !== 'quest') loadBoard();
  };
  // 옆으로 밀어 탭 넘기기 — 가로로 64 px 넘게, 세로보다 1.6배 넘게 움직였을 때만(세로 스크롤 · 글자 입력과 안 싸우게)
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    const el = e.target as HTMLElement;
    touch.current = { x: t.clientX, y: t.clientY, t: Date.now(), skip: !!el.closest('input, textarea, [data-noswipe]') };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const st = touch.current;
    touch.current = null;
    if (!st || st.skip) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - st.x;
    const dy = t.clientY - st.y;
    if (Math.abs(dx) < 64 || Math.abs(dx) < Math.abs(dy) * 1.6 || Date.now() - st.t > 700) return;
    const i = TABS.indexOf(tab) + (dx < 0 ? 1 : -1);
    if (i >= 0 && i < TABS.length) go(TABS[i]);
  };

  if (phase === 'loading') {
    return (
      <main className={s.page}>
        <div className={s.center}>
          <div className={s.bob}><Mascot mood="read" size={96} /></div>
          <p className="t-caption c-t3">로딩 중.. 잠만</p>
        </div>
      </main>
    );
  }
  if (phase === 'offline') {
    return (
      <main className={s.page}>
        <div className={s.center}>
          <Mascot mood="oops" size={96} />
          <p className="t-headline">인터넷 터진 듯 ㅠ</p>
          <button className={s.primary} onClick={() => location.reload()}>다시 ㄱ</button>
        </div>
      </main>
    );
  }
  if (phase === 'join') {
    return (
      <main className={s.page}>
        <div className={s.themeCorner}><ThemeToggle /></div>
        <JoinCard cap={cap} onJoined={(c, k) => { setMe(c); setCap(k); setPhase('ready'); loadBoard(); }} />
      </main>
    );
  }

  return (
    <main className={s.page} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <header className={s.top}>
        <div className={s.brand}>
          <span className={s.bob}><Mascot size={44} /></span>
          <div>
            <p className={s.logo}>바코드 원정대</p>
            <p className="t-caption c-t3">{me?.name} 대원 출근 완료</p>
          </div>
        </div>
        <div className={s.topRight}>
          <ThemeToggle />
          <div className={s.wallet} key={earned}>
            <Coin size={22} />
            <span>{won(earned)}</span>
          </div>
        </div>
      </header>

      {cap && <Progress cap={cap} />}

      <nav className={s.tabs} aria-label="화면">
        {([['quest', '모으기'], ['mine', '내 지갑'], ['rank', '랭킹']] as const).map(([k, label]) => (
          <button key={k} className={`${s.tab} ${tab === k ? s.tabOn : ''}`} onClick={() => go(k)}>
            {label}
          </button>
        ))}
        <span className={s.tabPill} style={{ transform: `translateX(${TABS.indexOf(tab) * 100}%)` }} aria-hidden />
      </nav>
      <p className={`t-micro c-t3 ${s.swipeHint}`}>옆으로 쓱 밀어도 탭 넘어감</p>

      <div key={tab} className={`${s.pane} ${slide === 'L' ? s.slideL : slide === 'R' ? s.slideR : ''}`}>

      {tab === 'quest' && editing && (
        <Quest
          key={`edit-${editing.id}`}
          cap={cap}
          say={say}
          edit={editing}
          onCancel={() => { setEditing(null); setSlide('R'); setTab('mine'); loadBoard(); }}
          onWithdrawn={(c) => {
            selfDrop.current = true;
            setCap(c);
            setEditing(null);
            say('취소함, 그만큼 빠짐');
            setSlide('R');
            setTab('mine');
            loadBoard();
          }}
          onDone={(c) => {
            setCap(c);
            setEditing(null);
            say('고침 완료! 검수 다시 들어감');
            setSlide('R');
            setTab('mine');
            loadBoard();
          }}
        />
      )}
      {tab === 'quest' && !editing && (
        <Quest
          key="new"
          cap={cap}
          say={say}
          onDone={(c, got) => {
            setCap(c);
            setParty((n) => n + 1);
            say(`+${won(got ?? c.reward_won)} 적립! 지갑 두둑해지는 중`);
            loadBoard();
          }}
        />
      )}
      {tab === 'mine' && (
        <Mine
          board={board}
          onEdit={async (id) => {
            try {
              const d = await api.mine(id);
              setEditing(d);
              setSlide('R');
              setTab('quest');
              window.scrollTo({ top: 0 });
            } catch (e) {
              say(e instanceof CollectError ? e.message : '못 불러옴 ㅠ 다시 눌러 봐', 'bad');
            }
          }}
        />
      )}
      {tab === 'rank' && <Rank board={board} />}
      </div>

      {party > 0 && <Confetti key={party} />}
      {toast && <div className={`${s.toast} ${toast.tone === 'bad' ? s.toastBad : ''}`} role="status">{toast.text}</div>}
    </main>
  );
}

// ── 처음 한 번 이름 ────────────────────────────────────────────────────────

function JoinCard({ cap, onJoined }: { cap: Cap | null; onJoined: (c: Collector, cap: Cap) => void }) {
  const [name, setName] = useState('');
  const [exists, setExists] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const go = async (confirm: boolean) => {
    if (!name.trim()) return;
    setBusy(true);
    setErr('');
    try {
      const r = await api.join(name.trim(), confirm);
      if (r.exists) setExists(r.name ?? name.trim());
      else if (r.collector) onJoined(r.collector, r.cap);
    } catch (e) {
      setErr(e instanceof CollectError ? e.message : '인터넷이 좀 불안함, 다시 ㄱ');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={`${s.join} ${s.pop}`}>
      <div className={s.bob}><Mascot mood="happy" size={112} /></div>
      <h1 className={s.joinTitle}>바코드 원정대</h1>
      <p className={`t-body c-t2 ${s.joinSub}`}>과자 봉지 사진 3장 찍으면 {won(cap?.reward_won ?? 500)} 줍줍</p>
      <ul className={s.rules}>
        <li><b>1</b><span>앞면, 표기면(뒷면), 바코드 찰칵</span></li>
        <li><b>2</b><span>AI가 읽어 준 거 맞는지 눈으로 슥</span></li>
        <li><b>3</b><span>제출 누르면 바로 적립, 선착순 300건</span></li>
      </ul>
      {exists ? (
        <div className={s.joinBox}>
          <p className="t-strong">「{exists}」 이미 있는데, 혹시 본인? 도플갱어?</p>
          <p className="t-caption c-t2">본인이면 기록이랑 돈 그대로 이어짐<br />남의 이름 쓰면 정산 꼬임 주의</p>
          <div className={s.row2}>
            <button className={s.primary} disabled={busy} onClick={() => go(true)}>ㅇㅇ 나임</button>
            <button className={s.ghost} disabled={busy} onClick={() => { setExists(null); setName(''); }}>아님, 딴 이름</button>
          </div>
        </div>
      ) : (
        <form className={s.joinBox} onSubmit={(e) => { e.preventDefault(); go(false); }}>
          <label className="t-strong" htmlFor="cname">대원 이름</label>
          <input id="cname" className={s.input} value={name} autoComplete="name" placeholder="돈 보낼 때 쓸 이름, 본명 ㄱ" onChange={(e) => setName(e.target.value)} />
          <p className="t-caption c-t3">딱 한 번만 쓰면 됨<br />이 폰으로 다시 오면 알아서 이어짐</p>
          <button className={s.primary} disabled={busy || !name.trim()}>{busy ? '확인 중..' : '원정 출발'}</button>
        </form>
      )}
      {err && <p className={s.err}>{err}</p>}
    </section>
  );
}

// ── 전체 진행 ──────────────────────────────────────────────────────────────

function Progress({ cap }: { cap: Cap }) {
  const pct = Math.min(100, (cap.total / cap.limit) * 100);
  return (
    <section className={s.progress} aria-label="전체 진행">
      <div className={s.progressHead}>
        <span className="t-strong">다 같이 모으는 중</span>
        <span className="t-caption c-t2"><b className={s.progressNum}>{cap.total}</b> / {cap.limit}건</span>
      </div>
      <div className={s.bar}><div className={s.barFill} style={{ width: `${Math.max(pct, 2)}%` }} /></div>
      <p className="t-caption c-t3">{cap.full ? '마감! 다들 고생했다 진짜 ㅠ' : `남은 자리 ${Math.max(0, cap.limit - cap.total)}건, 선착순임`}</p>
      {!cap.full && cap.event && (
        <div className={s.eventLine}>
          <b>이벤트 {cap.event.name}</b>
          <span>
            지금 한 건 {won(cap.event.reward_won)}
            {cap.base_reward_won != null && cap.base_reward_won !== cap.event.reward_won && <> (평소 <s>{won(cap.base_reward_won)}</s>)</>}
            , {whenKo(cap.event.end_ts)}까지
          </span>
        </div>
      )}
      {!cap.full && !cap.event && cap.next_event && (
        <p className={`t-caption c-t2 ${s.nextEvent}`}>
          예고: {whenKo(cap.next_event.start_ts)}부터 「{cap.next_event.name}」 한 건 {won(cap.next_event.reward_won)}
        </p>
      )}
    </section>
  );
}

// ── 모으기 ─────────────────────────────────────────────────────────────────

function Quest({ cap, say, onDone, edit: target, onCancel, onWithdrawn }: {
  cap: Cap | null; say: (t: string, tone?: 'ok' | 'bad') => void; onDone: (c: Cap, got?: number | null) => void;
  edit?: MineDetail; onCancel?: () => void; onWithdrawn?: (c: Cap) => void;
}) {
  const eid = target?.id;
  const [photos, setPhotos] = useState<Record<Slot, SlotState>>(EMPTY_PHOTOS);
  const [fields, setFields] = useState<Fields>(EMPTY_FIELDS);
  const [touched, setTouched] = useState<Set<FieldKey>>(new Set());
  const [bstat, setBstat] = useState<BarcodeStatus | null>(null);
  const [sending, setSending] = useState(false);
  const [restored, setRestored] = useState(false);
  const touchedRef = useRef(touched);
  touchedRef.current = touched;
  const photosRef = useRef(photos);
  photosRef.current = photos;
  const readSeq = useRef<Record<Slot, number>>({ front: 0, label: 0, barcode: 0 });
  // 판독 대기(2026-11-06 사용자 「스캔 중에도 다른 사진을 올리게, 스캔 대기를 걸어 두게」) — 읽는 중에 사진이 더해지면 지금 판독이 끝난 뒤 한 번 더 읽는다
  const pendingRead = useRef<Record<Slot, boolean>>({ front: false, label: false, barcode: false });
  const readTimer = useRef<Partial<Record<Slot, number>>>({});
  // 화면을 떠나면 남은 「다시 읽기」 타이머를 지운다(떠난 화면에서 판독 요청이 나가지 않게)
  useEffect(() => () => Object.values(readTimer.current).forEach((t) => window.clearTimeout(t)), []);
  const clearedAt = useRef<Partial<Record<FieldKey, number>>>({}); // X 로 비운 시각(칸마다)

  // 새로고침해도 하던 것을 잃지 않게 — 사진 id · 판독 · 칸 값만(사진은 서버 썸네일로 다시 그린다)
  useEffect(() => {
    (async () => {
      if (target) {
        // 고치기는 초안(localStorage)을 읽지도 쓰지도 않는다 — 하던 새 제출 초안을 지키려고
        const f = seedFields(target);
        setFields(f);
        setTouched(seedTouched(target, f));
        setPhotos(await seedPhotos(target));
        setRestored(true);
        return;
      }
      try {
        const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
        if (d?.fields) setFields({ ...EMPTY_FIELDS, ...d.fields });
        if (d?.touched) setTouched(new Set(d.touched));
        if (d?.photos) {
          const next = EMPTY_PHOTOS();
          for (const slot of SLOTS) {
            const p = d.photos[slot];
            const ids: string[] = (Array.isArray(p?.ids) ? p.ids : p?.photoId ? [p.photoId] : []).slice(0, maxOf(slot));
            if (!ids.length) continue;
            next[slot] = {
              shots: await Promise.all(ids.map(async (id) => ({ key: id, status: 'done' as const, photoId: id, preview: await thumbUrl(id) }))),
              reading: false, readId: p.readId, read: p.read, readOf: ids.join(','), failed: !p.read,
              hist: Array.isArray(p.hist) ? p.hist : undefined,
            };
          }
          setPhotos(next);
        }
      } catch {}
      setRestored(true);
    })();
  }, []);

  useEffect(() => {
    if (!restored || target) return;
    try {
      const ph = Object.fromEntries(SLOTS.map((k) => {
        const ids = photos[k].shots.filter((x) => x.status === 'done').map((x) => x.photoId!);
        return [k, ids.length ? { ids, readId: photos[k].readId, read: photos[k].read, hist: photos[k].hist } : null];
      }));
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ photos: ph, fields, touched: Array.from(touched) }));
    } catch {}
  }, [photos, fields, touched, restored]);

  // 바코드 — 검사 자리는 바로, 중복 · 등록 여부는 서버에 잠깐 뒤 묻는다
  useEffect(() => {
    const code = fields.barcode.replace(/\D/g, '');
    if (!code) return setBstat(null);
    if (!gtinValid(code)) {
      setBstat({ ok: false, code: 'checksum', message: code.length < 8 ? '숫자 끝까지 다 쳐야 함' : '바코드 숫자 하나 틀린 듯? 사진이랑 한 번만 비교 ㄱ' });
      return;
    }
    let alive = true;
    let retry: number | undefined;
    // 확인을 못 받으면(망 끊김) 빈칸처럼 막혀 있던 것 — 이유를 보이고 잠깐 뒤 다시 묻는다(2026-11-06)
    const ask = async (n: number) => {
      try {
        const st = await api.barcodeCheck(code, eid);
        if (alive) setBstat(st);
      } catch {
        if (!alive) return;
        setBstat({ ok: false, code: 'error', message: '바코드 확인이 안 됨, 다시 확인하는 중..' });
        if (n < 4) retry = window.setTimeout(() => ask(n + 1), 1500 * (n + 1));
      }
    };
    const t = window.setTimeout(() => ask(0), 450);
    return () => { alive = false; window.clearTimeout(t); window.clearTimeout(retry); };
  }, [fields.barcode, eid]);

  // onlyEmpty — 사진을 더해 다시 읽으면 **빈칸만** 채운다(2026-11-06 사용자 「x 로 비운 칸만 다시 업데이트 · 의도적으로 비운 건 안 채우고」 ·
  // 새 제출 · 고치기 둘 다). 빈칸 = X 로 비운 칸 · 아직 못 읽은 칸. 「-」(라벨에 없음)와 값이 있는 칸은 덮지 않고,
  // 사람이 지워 비운 칸은 「고친 칸」(touched)이라 위에서 건너뛴다. 「다시 읽기」(again)만 그 칸 전부를 새로 채운다.
  // started — 이 판독을 보낸 시각. 그 뒤에 X 로 비운 칸은 이 판독(옛 사진)으로 채우지 않는다 — 사진을 더한 다음 판독이 채운다.
  const applyRead = (slot: Slot, read: Read, onlyEmpty = false, started = 0) => {
    setFields((f) => {
      const next = { ...f };
      for (const [k, v] of Object.entries(read.values)) {
        const key = k as FieldKey;
        if (!(key in next) || touchedRef.current.has(key)) continue;
        if (onlyEmpty && next[key].trim() !== '') continue;
        if ((clearedAt.current[key] ?? 0) > started) continue;
        if (v !== null && v !== undefined && v !== '') next[key] = toStr(v);
      }
      // 앞면 이름은 표기면 제품명을 아직 못 받았을 때만 임시로(정식 이름은 표기면 「제품명」)
      const dn = read.values.display_name;
      if (slot === 'front' && dn && !next.name && !touchedRef.current.has('name')) next.name = toStr(dn);
      return next;
    });
  };

  const setSlot = (slot: Slot, fn: (st: SlotState) => SlotState) => setPhotos((p) => ({ ...p, [slot]: fn(p[slot]) }));

  // 판독 — 그 칸의 올라간 사진 전부를 한 번에. tier 를 올리면 위 모델로 다시 읽고, 앞 판독과 다른 칸을 보여 준다.
  const readSlot = async (slot: Slot, tier = 0, again = false) => {
    const st = photosRef.current[slot];
    const ids = st.shots.filter((x) => x.status === 'done').map((x) => x.photoId!);
    if (!ids.length) return;
    if (st.reading) {
      pendingRead.current[slot] = true;
      return;
    }
    const seq = ++readSeq.current[slot];
    const started = Date.now();
    // 그 칸 사진을 전부 빼고 새로 찍었으면(앞 판독 없음) 새 출발 — 사람이 안 고친 칸을 새 판독으로 채운다. 사진을 더한 것이면 빈칸만.
    const onlyEmpty = !again && !!st.read;
    photosRef.current = { ...photosRef.current, [slot]: { ...st, reading: true } }; // 같은 틱에 두 번 불려도 하나만 돈다
    setSlot(slot, (x) => ({ ...x, reading: true, failed: false }));
    if (again) {
      // 다시 읽기는 그 칸 값을 새 판독으로 다시 채운다(사람이 고친 표시를 지운다)
      setTouched((t) => {
        const n = new Set(t);
        (Object.keys(SLOT_OF) as FieldKey[]).forEach((k) => SLOT_OF[k] === slot && n.delete(k));
        return n;
      });
    }
    try {
      const r = await api.read(slot, ids, tier, again ? st.readId : undefined, eid);
      if (seq !== readSeq.current[slot]) return; // 그 사이 사진이 바뀌었다 — 새 판독이 맡는다
      // 판독 전에 바로 세운 사진(옆 · 거꾸로 찍은 것)은 썸네일을 다시 받는다
      const turned = new Set(r.rotated ?? []);
      const fresh = turned.size ? Object.fromEntries(await Promise.all([...turned].map(async (id) => [id, `${await thumbUrl(id)}&r=1`]))) : {};
      settle(slot);
      setSlot(slot, (x) => ({
        ...x, reading: false, failed: false, readId: r.read_id, read: r.read, readOf: ids.join(','),
        hist: [...histOf(x).filter((id) => id !== r.read_id), r.read_id].slice(-READ_HISTORY),
        shots: turned.size ? x.shots.map((y) => (y.photoId && fresh[y.photoId] ? { ...y, preview: fresh[y.photoId] } : y)) : x.shots,
      }));
      applyRead(slot, r.read, onlyEmpty, started);
      if (turned.size) say(`${SLOT_INFO[slot].title} 사진 ${turned.size}장 바로 세워서 읽음`);
      if (!r.read.right_photo) say(`이거 ${SLOT_INFO[slot].title} 사진 맞음? 한 번만 확인 ㄱ`, 'bad');
      else if (r.read.ok) say(`${SLOT_INFO[slot].title} 읽음 ㅇㅋ${again && r.read.model_label ? ` (${r.read.model_label})` : ''}`);
      if (r.barcode_status && !r.barcode_status.ok) say(r.barcode_status.message, 'bad');
    } catch (e) {
      if (seq !== readSeq.current[slot]) return;
      settle(slot);
      setSlot(slot, (x) => ({ ...x, reading: false, failed: true }));
      say(e instanceof CollectError ? e.message : '판독 실패.. 「다시 읽기」 눌러 줘', 'bad');
    } finally {
      // 읽는 사이 더해진 사진이 있으면(대기 표시가 없어도) 한 번 더 — 대기 표시를 놓쳐 판독이 무시되던 틈을 막는다(2026-11-06 사용자)
      const now = photosRef.current[slot].shots.filter((x) => x.status === 'done').map((x) => x.photoId!);
      const missed = now.some((id) => !ids.includes(id));
      if (pendingRead.current[slot] || missed) {
        pendingRead.current[slot] = false;
        window.setTimeout(() => scheduleRead(slot), 0); // 올리는 중이면 끝난 뒤
      }
    }
  };

  // 판독이 끝난 것을 바로 적어 둔다 — state 가 다시 그려지기 전에 들어온 읽기 요청이 「읽는 중」으로 보고 대기만 걸어 두고 사라지지 않게
  const settle = (slot: Slot) => {
    photosRef.current = { ...photosRef.current, [slot]: { ...photosRef.current[slot], reading: false } };
  };

  // AI 검수 요청(2026-11-06 사용자 「칸은 채워졌는데 빈 것으로 취급되면 직접 AI 검수 요청」) — 사진이 있는 칸을 지금 사진 전부로 다시 읽는다.
  // 사람이 고친 칸은 그대로 두고(다시 읽기와 다르다) 판독 기록만 새로 — 서버 검수가 새 판독과 맞대 본다.
  const requestCheck = () => {
    const todo = SLOTS.filter((k) => photosRef.current[k].shots.some((x) => x.status === 'done'));
    if (!todo.length) return say('사진부터 올려 줘', 'bad');
    todo.forEach((k) => readSlot(k, photosRef.current[k].read?.tier ?? 0));
    say('AI 다시 확인 중');
  };

  // 사진을 더하거나 빼면 잠깐 뒤 그 칸을 다시 읽는다(여러 장을 연달아 올릴 때 한 번만 읽게)
  const scheduleRead = (slot: Slot) => {
    window.clearTimeout(readTimer.current[slot]);
    readTimer.current[slot] = window.setTimeout(() => {
      const st = photosRef.current[slot];
      if (st.shots.some((x) => x.status === 'uploading')) return scheduleRead(slot);
      readSlot(slot, st.read?.tier ?? 0);
    }, 1200);
  };

  const pick = async (slot: Slot, files: FileList | File[] | undefined) => {
    let list = Array.from(files ?? []);
    if (!list.length) return;
    if (maxOf(slot) === 1) {
      // 한 장 칸 — 있던 사진과 돌던 판독을 버리고 새 사진으로 바꾼다
      list = list.slice(0, 1);
      readSeq.current[slot]++;
      pendingRead.current[slot] = false;
      window.clearTimeout(readTimer.current[slot]);
      const fresh = { ...EMPTY_SLOT(), hist: histOf(photosRef.current[slot]) }; // 칸 값은 남아 있으니 판독 기록도 남긴다
      setSlot(slot, () => fresh);
      photosRef.current = { ...photosRef.current, [slot]: fresh };
    }
    const room = maxOf(slot) - photosRef.current[slot].shots.length;
    if (room <= 0) return say(`${SLOT_INFO[slot].title}은 ${MAX_PER_SLOT}장까지만`, 'bad');
    if (list.length > room) say(`${MAX_PER_SLOT}장까지라 ${room}장만 올림`, 'bad');
    await Promise.all(list.slice(0, room).map(async (file) => {
      let image: string;
      try {
        image = await shrink(file);
      } catch {
        say('사진이 안 열림 ㅠ 다른 걸로 ㄱ', 'bad');
        return;
      }
      const key = Math.random().toString(36).slice(2);
      setSlot(slot, (x) => ({ ...x, shots: [...x.shots, { key, status: 'uploading', preview: image }] }));
      try {
        const r = await api.photo(slot, image);
        setSlot(slot, (x) => ({ ...x, shots: x.shots.map((y) => (y.key === key ? { ...y, status: 'done', photoId: r.photo_id } : y)) }));
      } catch (e) {
        const msg = e instanceof CollectError ? e.message : '업로드 실패.. 와이파이 괜찮음?';
        setSlot(slot, (x) => ({ ...x, shots: x.shots.map((y) => (y.key === key ? { ...y, status: 'error', error: msg } : y)) }));
        say(msg, 'bad');
      }
    }));
    scheduleRead(slot);
  };

  const removeShot = (slot: Slot, key: string) => {
    setSlot(slot, (x) => {
      const shots = x.shots.filter((y) => y.key !== key);
      if (shots.length) return { ...x, shots };
      readSeq.current[slot]++; // 다 뺐다 — 돌던 판독 결과는 버린다
      pendingRead.current[slot] = false;
      return { ...EMPTY_SLOT(), hist: x.hist ?? histOf(x) }; // 칸 값은 남아 있으니 판독 기록도 남긴다
    });
    // 빼기는 다시 읽지 않는다(2026-11-06 사용자 「제거는 AI 검사가 필요 없다 · 추가할 때만」) — 남은 판독 값을 그대로 둔다
  };

  const edit = (k: FieldKey, v: string) => {
    setFields((f) => ({ ...f, [k]: v }));
    setTouched((t) => new Set(t).add(k));
  };
  // 한 칸 비우기(2026-11-06 사용자 「채워진 항목 즉시 비우기」) — 비운 칸은 「AI가 다시 채울 칸」으로 연다:
  // 사진을 더해 다시 읽으면 그 칸을 채운다(같은 날 사용자 「x 로 비우고 사진을 올리면 그 칸만 다시 업데이트」 — 전에는 「고친 칸」으로 막아 안 채웠다).
  const clear = (k: FieldKey) => {
    clearedAt.current[k] = Date.now();
    setFields((f) => ({ ...f, [k]: '' }));
    setTouched((t) => {
      if (!t.has(k)) return t;
      const n = new Set(t);
      n.delete(k);
      return n;
    });
  };

  // 낸 것 취소(2026-11-06 사용자 「취소하면 취소 처리되고 금액도 그만큼 차감」) — 무효와 같다 · 그 바코드는 다시 낼 수 있다
  const withdraw = async () => {
    if (!target) return;
    const amount = won(target.reward_won ?? cap?.reward_won ?? 500);
    if (!window.confirm(`「${target.name}」 제출을 취소할까?\n기록이 완전히 지워지고 ${amount}이 빠짐, 이 바코드는 다시 낼 수 있음`)) return;
    setSending(true);
    try {
      const r = await api.cancel(target.id);
      onWithdrawn?.(r.cap);
    } catch (e) {
      say(e instanceof CollectError ? e.message : '취소 실패 ㅠ 한 번만 더', 'bad');
    } finally {
      setSending(false);
    }
  };

  // 전부 처음으로(2026-11-06 사용자 「사진 찍기에 초기화 버튼」) — 사진 · 판독 · 칸 값. 고치는 중이면 낸 그대로로 되돌린다.
  const dirty = SLOTS.some((k) => photos[k].shots.length) || ALL_KEYS.some((k) => fields[k] !== '');
  const resetAll = async () => {
    if (!window.confirm(target ? '고친 것 다 버리고 낸 그대로 돌릴까?' : '사진이랑 칸 전부 지울까?')) return;
    SLOTS.forEach((k) => {
      window.clearTimeout(readTimer.current[k]);
      readSeq.current[k]++; // 돌던 판독 결과는 버린다
      pendingRead.current[k] = false;
    });
    setBstat(null);
    if (target) {
      const f = seedFields(target);
      setFields(f);
      setTouched(seedTouched(target, f));
      setPhotos(await seedPhotos(target));
    } else {
      setPhotos(EMPTY_PHOTOS());
      setFields(EMPTY_FIELDS);
      setTouched(new Set());
      try { localStorage.removeItem(DRAFT_KEY); } catch {}
    }
    say(target ? '낸 그대로 돌려놓음' : '싹 비움, 처음부터 ㄱ');
  };

  // 칸마다 — 두 모델이 다르게 읽은 값
  const alt = useMemo(() => {
    // 두 판독 중 지금 칸 값과 다른 쪽을 보여 준다(칸에는 주 모델 값, 바코드는 막대 해독 값이 들어가 있다)
    const m: Partial<Record<FieldKey, string>> = {};
    for (const slot of SLOTS) {
      for (const d of photos[slot].read?.disagree ?? []) {
        const k = d.field as FieldKey;
        const cands = [toStr(d.primary), toStr(d.verify)];
        m[k] = cands.find((c) => c !== fields[k]) ?? '';
      }
    }
    return m;
  }, [photos, fields]);

  // 제출을 막는 것 — 이름(아래 막대에 보일 말)과 화면에서 그 자리(id). 누르면 첫 자리로 옮겨 가 반짝인다(2026-11-06 사용자).
  const blockers = useMemo(() => {
    // msg 가 있으면 「비어서」가 아니라 「받을 수 없어서」 막힌 것 — 빈 칸 안내와 섞지 않고 먼저 보인다(2026-11-06 「이미 있는 제품인데 빈 칸이 있다고 나온다」)
    const out: { label: string; id: string; msg?: string }[] = [];
    for (const slot of SLOTS) {
      const st = photos[slot];
      if (!st.shots.some((x) => x.status === 'done')) out.push({ label: `${SLOT_INFO[slot].title} 사진`, id: `slot-${slot}` });
      else if (st.reading || st.shots.some((x) => x.status === 'uploading')) out.push({ label: `${SLOT_INFO[slot].title} 읽는 중`, id: `slot-${slot}` });
    }
    if (!fields.name.trim() || isDash(fields.name)) out.push({ label: '제품 이름', id: 'f-name' });
    // 바코드 확인 자체가 안 될 때(망 끊김)는 막지 않는다 — 제출 때 서버가 다시 보고, 못 보면 검수 사유로 따로 남긴다(2026-11-06 사용자 「바코드 확인 실패는 별도 처리」)
    if (!bstat?.ok && bstat?.code !== 'error') {
      const why: Record<string, string> = { catalog: '이미 와츠인에 있는 제품', duplicate: '이미 누가 낸 바코드', checksum: '바코드 숫자 확인', error: '바코드 확인 중' };
      const filled = !!(bstat && fields.barcode.trim());
      out.push({ label: filled ? why[bstat!.code] ?? '바코드 확인' : '바코드', id: 'f-barcode', msg: filled && bstat!.code !== 'error' ? bstat!.message : undefined });
    }
    return [...out.filter((b) => b.msg), ...out.filter((b) => !b.msg)];
  }, [photos, fields, bstat]);
  const missing = useMemo(() => blockers.map((b) => b.label), [blockers]);
  // 빈 자리로 — 가운데로 굴려 보이고, 입력칸이면 커서를 넣고, 잠깐 테두리를 반짝인다
  const goToBlocker = () => {
    const b = blockers[0];
    const el = b && document.getElementById(b.id);
    if (!el) return;
    const ring = (el.closest(`.${s.row}`) as HTMLElement | null) ?? el;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (el instanceof HTMLInputElement) window.setTimeout(() => el.focus({ preventScroll: true }), 350);
    ring.classList.remove(s.flash);
    void ring.offsetWidth; // 다시 누르면 다시 반짝이게
    ring.classList.add(s.flash);
    window.setTimeout(() => ring.classList.remove(s.flash), 1800);
    say(b.msg ?? `${b.label} 먼저!`, 'bad');
  };

  // 숫자 칸에 숫자도 「-」도 아닌 것 — 막지 않고 알리기만 한다(2026-11-06 사용자 「사진 · 제품 이름만 제대로면 통과」 · 서버가 숫자만 골라 쓰고 검수 사유로 남긴다)
  const badNum = useMemo(() => NUMERIC.filter((k) => fields[k].trim() && !isDash(fields[k]) && !num(fields[k])).map((k) => LABEL[k]), [fields]);

  const done = SLOTS.filter((k) => slotReady(photos[k])).length;
  const closed = !!cap?.full && !target; // 마감 뒤에도 이미 낸 것은 고칠 수 있다(같은 1건)

  const submit = async () => {
    if (sending) return;
    if (missing.length) return goToBlocker();
    setSending(true);
    try {
      // 비운 칸 · 「-」 = 라벨에 없음 — 글 칸은 「-」, 숫자 칸은 null 로 보낸다
      const text = (v: string) => (v.trim() && !isDash(v) ? v.trim() : DASH);
      // 숫자 칸도 적힌 그대로 보낸다(2026-11-06 사용자 「숫자 칸 가공 금지 · 가공은 뒤 처리에서」) — 「1,200」·「12g」 그대로. 비었거나 「-」면 값 없음
      const n = (k: FieldKey) => (fields[k].trim() && !isDash(fields[k]) ? fields[k] : null);
      const unit = (k: FieldKey) => (fields[k].trim() && !isDash(fields[k]) ? fields[k].trim() : null);
      const nutrition = {
        basis: text(fields.basis),
        ...Object.fromEntries(NUTRIENTS.map((x) => [x.key, n(x.key)])),
        fiber_g: n('fiber_g'),
        sugar_alcohols: text(fields.sugar_alcohols),
        others: text(fields.others),
      };
      const amounts = {
        total_content: n('total_content'), total_unit: unit('total_unit'),
        serving_size: n('serving_size'), serving_unit: unit('serving_unit'),
        servings_per_container: n('servings_per_container'),
      };
      const ph = Object.fromEntries(SLOTS.map((k) => [k, photos[k].shots.filter((x) => x.status === 'done').map((x) => x.photoId!)])) as Record<Slot, string[]>;
      const rd = Object.fromEntries(SLOTS.filter((k) => histOf(photos[k]).length).map((k) => [k, histOf(photos[k])]));
      const body = {
        name: fields.name.trim(), barcode: fields.barcode.replace(/\D/g, ''),
        ...Object.fromEntries(IDENT.map((x) => [x.key, text(fields[x.key])])),
        ingredients: text(fields.ingredients), nutrition, amounts,
      };
      if (target) {
        const r = await api.resubmit(target.id, ph, rd, body);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        onDone(r.cap);
        return;
      }
      const r = await api.submit(ph, rd, body);
      setPhotos(EMPTY_PHOTOS());
      setFields(EMPTY_FIELDS);
      setTouched(new Set());
      setBstat(null);
      try { localStorage.removeItem(DRAFT_KEY); } catch {}
      window.scrollTo({ top: 0, behavior: 'smooth' });
      onDone(r.cap, r.reward_won);
    } catch (e) {
      say(e instanceof CollectError ? e.message : '제출 실패 ㅠ 한 번만 더 눌러 봐', 'bad');
    } finally {
      setSending(false);
    }
  };

  const notesOf = (slot: Slot) => {
    const r = photos[slot].read;
    if (!r || !slotReady(photos[slot])) return null;
    const lines = [
      ...(!r.right_photo ? [`AI 왈: 이거 ${SLOT_INFO[slot].title} 사진 아닌 것 같다는데? 다시 찍는 거 추천`] : []),
      ...(r.suspicious ? r.notes.slice(0, 1).map((n) => n.replace(/\s*·\s*/g, ', ')) : []),
      ...(!r.ok ? ['AI가 이 사진은 못 읽겠대 ㅠ 다시 찍거나 직접 쳐 주기'] : []),
    ];
    return lines.length ? <Note lines={lines} /> : null;
  };

  // 칸 한 줄 — 왼쪽 이름, 오른쪽 값(테두리 없는 입력). AI가 채우고 사람은 훑어보며 고치기만 한다(2026-11-03 사용자 「심플하게 · 검증만」).
  // 두 AI가 다르게 읽은 칸만 색이 들어가고, 그 아래 다른 AI 값을 누르면 바꿔 끼운다.
  const row = (k: FieldKey, opts: { numeric?: boolean; unit?: string; unitKey?: FieldKey; placeholder?: string } = {}) => {
    const flagged = alt[k] !== undefined && !touched.has(k);
    const shot = slotReady(photos[SLOT_OF[k]]);
    const readV = photos[SLOT_OF[k]].read?.values?.[k];
    const unread = shot && (readV === null || readV === undefined || readV === '') && !fields[k];
    const required = !OPTIONAL.includes(k);
    return (
      <div key={k} className={`${s.row} ${flagged ? s.rowFlag : ''}`}>
        <label htmlFor={`f-${k}`} className={s.rowLabel}>
          {LABEL[k]}{required && <em className={s.req}>필수</em>}
        </label>
        <div className={s.rowValue}>
          <span className={s.clearWrap}>
            <input
              id={`f-${k}`}
              className={`${s.rowInput} ${s.rowInputClear} ${unread && required ? s.rowMiss : ''}`}
              value={fields[k]}
              inputMode={opts.numeric ? 'decimal' : undefined}
              autoComplete="off"
              placeholder={unread ? (required ? '못 읽음, 직접 입력' : '못 읽음') : opts.placeholder ?? (required ? '' : '-')}
              onChange={(e) => edit(k, e.target.value)}
            />
            <ClearX show={!!fields[k]} label={LABEL[k]} onClear={() => clear(k)} />
          </span>
          {opts.unitKey ? (
            <input
              aria-label={`${LABEL[k]} 단위`}
              className={`${s.rowInput} ${s.rowUnitInput}`}
              value={fields[opts.unitKey]}
              list="collect-units"
              autoComplete="off"
              placeholder="단위"
              onChange={(e) => edit(opts.unitKey!, e.target.value)}
            />
          ) : opts.unit ? (
            <span className={s.rowUnit}>{opts.unit}</span>
          ) : null}
        </div>
        {flagged && (
          <button type="button" className={s.alt} onClick={() => edit(k, alt[k] ?? '')}>
            다른 AI는 <b>{alt[k] || '못 읽음'}</b>, 누르면 바꿈
          </button>
        )}
      </div>
    );
  };

  const flaggedN = ALL_KEYS.filter((k) => alt[k] !== undefined && !touched.has(k)).length;
  const anyRead = SLOTS.some((k) => slotReady(photos[k]));

  return (
    <>
      {target && (
        <section className={`${s.card} ${s.editBanner}`}>
          <div>
            <p className="t-strong">{target.name} 고치는 중</p>
            <p className="t-caption c-t2">고칠 칸만 바꾸고 맨 아래에서 다시 제출<br />다시 내면 새로 올린 걸로 처리됨, 검수도 다시</p>
          </div>
          <div className={s.editActions}>
            <button type="button" className={s.ghost} onClick={onCancel}>그만 고치기</button>
            <button type="button" className={s.dangerLink} disabled={sending} onClick={withdraw}>제출 취소</button>
          </div>
        </section>
      )}
      <section className={s.card}>
        <div className={s.cardHead}>
          <div>
            <h2 className="t-headline">1. 사진 찍기</h2>
            <p className="t-caption c-t3">칸마다 5장까지, 한 장에 안 담기면 나눠 찍기<br />찍으면 AI가 아래 칸 전부 채워 줌</p>
          </div>
          <div className={s.headRight}>
            {/* 늘 자리에 두고 비었을 때만 흐리게 — 나타났다 사라지며 머리가 밀리지 않게 */}
            <button type="button" className={s.resetBtn} disabled={!dirty || sending} onClick={resetAll}>{target ? '처음대로' : '초기화'}</button>
            <Stars n={done} />
          </div>
        </div>
        <div className={s.slots}>
          {SLOTS.map((slot, i) => (
            <SlotCard key={slot} slot={slot} n={i + 1} state={photos[slot]} disabled={closed}
              onPick={(f) => pick(slot, f)} onRemove={(k) => removeShot(slot, k)} onRetry={() => readSlot(slot, photos[slot].read?.tier ?? 0)} />
          ))}
        </div>
      </section>

      <section className={s.card}>
        <div className={s.cardHead}>
          <div>
            <h2 className="t-headline">2. AI가 채운 거 확인</h2>
            <p className="t-caption c-t3">사진이랑 다른 것만 고치면 끝</p>
          </div>
          <div className={s.headRight}>
            {/* 늘 자리에 두고 사진이 없거나 읽는 중이면 흐리게(머리가 밀리지 않게) */}
            <button type="button" className={s.resetBtn} disabled={!SLOTS.some((k) => photos[k].shots.some((x) => x.status === 'done')) || SLOTS.some((k) => photos[k].reading) || closed}
              onClick={requestCheck}>AI 검수 요청</button>
            {anyRead && (
              <span className={`${s.pill} ${flaggedN ? s.pillWarn : s.pillOk}`}>{flaggedN ? `확인 ${flaggedN}칸` : '다 맞음'}</span>
            )}
          </div>
        </div>

        <div className={s.group}>
          <h3 className={s.groupTitle}>제품</h3>
          {row('name')}
          {row('barcode', { numeric: true })}
          {/* 바코드 확인 줄은 비어도 자리를 잡아 둔다 — 판독이 바코드를 채우는 순간 아래 칸이 밀리지 않게 */}
          <p className={`${s.bstat} ${bstat ? (bstat.ok ? s.bstatOk : s.bstatBad) : ''}`} aria-live="polite">{bstat?.message ?? ''}</p>
          {IDENT.map((x) => row(x.key))}
        </div>

        <div className={s.group}>
          <h3 className={s.groupTitle}><label htmlFor="f-ingredients">원재료명</label></h3>
          <div className={s.clearWrapArea}>
          <textarea
            id="f-ingredients"
            rows={4}
            className={`${s.rowArea} ${alt.ingredients !== undefined && !touched.has('ingredients') ? s.rowFlag : ''}`}
            value={fields.ingredients}
            placeholder="라벨에 적힌 그대로"
            onChange={(e) => edit('ingredients', e.target.value)}
          />
          <ClearX show={!!fields.ingredients} label={LABEL.ingredients} onClear={() => clear('ingredients')} area />
          </div>
          {alt.ingredients !== undefined && !touched.has('ingredients') && (
            <button type="button" className={s.alt} onClick={() => edit('ingredients', alt.ingredients ?? '')}>
              다른 AI 판독으로 바꾸기
            </button>
          )}
        </div>

        <div className={s.group}>
          <h3 className={s.groupTitle}>영양성분</h3>
          {row('basis', { placeholder: '100 g당' })}
          {NUTRIENTS.map((x) => row(x.key, { numeric: true, unit: x.unit }))}
          {row('fiber_g', { numeric: true, unit: 'g' })}
          {row('sugar_alcohols')}
        </div>

        <div className={s.group}>
          <h3 className={s.groupTitle}><label htmlFor="f-others">기타 영양성분</label></h3>
          <div className={s.clearWrapArea}>
          <textarea
            id="f-others"
            rows={3}
            className={`${s.rowArea} ${s.rowAreaSm} ${alt.others !== undefined && !touched.has('others') ? s.rowFlag : ''}`}
            value={fields.others}
            placeholder={'위 칸에 없는 것, 한 줄에 하나\n예: 유당 0 g\n칼슘 345 mg'}
            onChange={(e) => edit('others', e.target.value)}
          />
          <ClearX show={!!fields.others} label={LABEL.others} onClear={() => clear('others')} area />
          </div>
          {alt.others !== undefined && !touched.has('others') && (
            <button type="button" className={s.alt} onClick={() => edit('others', alt.others ?? '')}>
              다른 AI 판독으로 바꾸기
            </button>
          )}
        </div>

        <div className={s.group}>
          <h3 className={s.groupTitle}>양</h3>
          {AMOUNTS.map((a) => row(a.key, { numeric: true, unitKey: a.unit }))}
          {row('servings_per_container', { numeric: true, unit: '회' })}
        </div>

        {/* 판독이 끝나면 생기는 줄 — 칸 위에 두면 다 읽는 순간 입력칸이 밀려 내려가서 맨 아래로(2026-11-06 사용자 「layout shift 없게」) */}
        {/* 칸마다 어느 모델이 읽었는지 + 「인식이 이상해」면 한 단계 위 모델로 다시(2026-11-03 저녁 사용자) */}
        {SLOTS.filter((k) => slotReady(photos[k]) && photos[k].read).map((k) => {
          const r = photos[k].read!;
          return (
            <div key={k} className={s.modelLine}>
              <span className="t-caption c-t2"><b>{SLOT_INFO[k].title}</b> {r.model_label ?? 'AI'} 판독</span>
              {r.next_label ? (
                <button type="button" className={s.reread} disabled={closed} onClick={() => readSlot(k, (r.tier ?? 0) + 1, true)}>
                  인식이 이상해? {r.next_label}로 다시 읽기
                </button>
              ) : (
                <span className="t-micro c-t3">가장 센 모델로 읽음</span>
              )}
            </div>
          );
        })}
        {notesOf('label')}
        {notesOf('barcode')}
        <div className={`t-caption c-t3 ${s.dashNote}`}>
          <p><b>-</b> = 라벨에 안 적혀 있음, 즉 값이 없다는 뜻</p>
          <p><b>0 g</b>으로 적힌 것만 0</p>
          <p>필수 칸 말고는 비워 두면 알아서 <b>-</b> 처리됨</p>
        </div>
        <datalist id="collect-units">
          {['g', 'mL', 'kg', 'L'].map((u) => <option key={u} value={u} />)}
        </datalist>
      </section>
      {/* 제출 막대는 body 로 — 탭 넘김 애니메이션(transform)이 fixed 를 칸 안에 가두지 않게 */}
      <BodyPortal>
      <div className={s.submitBar}>
        {closed ? (
          <p className="t-strong">마감! 같이 해 줘서 고맙다 진짜</p>
        ) : (
          <>
            {(missing.length > 0 || badNum.length > 0) && (
              <p className={`t-caption ${s.missing}`}>
                {blockers[0]?.msg
                  ? `제출 불가: ${blockers[0].msg}`
                  : missing.length > 0 ? `아직 빈 거: ${missing.slice(0, 4).join(', ')}${missing.length > 4 ? ` 외 ${missing.length - 4}` : ''}` : `숫자 아닌 칸 있음(${badNum.join(', ')}), 그래도 제출됨`}
              </p>
            )}
            <button className={`${s.primary} ${s.big} ${missing.length ? '' : s.ready}`} disabled={sending} aria-disabled={!!missing.length} onClick={submit}>
              {!target && <Coin size={22} />}
              {sending ? '보내는 중..' : target ? '고친 걸로 다시 제출' : `제출하고 ${won(cap?.reward_won ?? 500)} 냠`}
            </button>
          </>
        )}
      </div>
      </BodyPortal>
    </>
  );
}

// body 에 붙여 그린다(첫 그림은 서버 HTML 과 같게 비워 두고, 붙은 뒤에 그린다)
function BodyPortal({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return ready ? createPortal(children, document.body) : null;
}

// 칸 비우기 ✕ — 칸 안 오른쪽에 겹쳐 둔다(값이 없으면 숨기기만 · 자리는 그대로라 밀리지 않는다)
function ClearX({ show, label, onClear, area }: { show: boolean; label: string; onClear: () => void; area?: boolean }) {
  return (
    <button type="button" className={`${s.clearX} ${area ? s.clearXArea : ''}`} style={show ? undefined : { visibility: 'hidden' }}
      tabIndex={show ? 0 : -1} aria-label={`${label} 비우기`} onClick={onClear}>✕</button>
  );
}

function Stars({ n }: { n: number }) {
  return (
    <div className={s.stars} aria-label={`${n} / 3`}>
      {[0, 1, 2].map((i) => (
        <svg key={i} width="20" height="20" viewBox="0 0 24 24" className={i < n ? s.starOn : s.starOff} aria-hidden>
          <path d="M12 3.2l2.6 5.5 6 .8-4.4 4.1 1.1 5.9L12 16.6l-5.3 2.9 1.1-5.9L3.4 9.5l6-.8z" />
        </svg>
      ))}
    </div>
  );
}

function SlotCard({ slot, n, state, disabled, onPick, onRemove, onRetry }: {
  slot: Slot; n: number; state: SlotState; disabled: boolean;
  onPick: (f?: FileList) => void; onRemove: (key: string) => void; onRetry: () => void;
}) {
  const cam = useRef<HTMLInputElement>(null);
  const alb = useRef<HTMLInputElement>(null);
  const info = SLOT_INFO[slot];
  const ready = slotReady(state);
  const r = state.read;
  const warn = ready && r && (!r.right_photo || r.suspicious || r.disagree.length > 0 || !r.ok);
  const single = maxOf(slot) === 1;
  const full = !single && state.shots.length >= MAX_PER_SLOT; // 한 장 칸은 늘 바꿔 올릴 수 있다
  const busy = state.reading || state.shots.some((x) => x.status === 'uploading');
  // 판독에 안 들어간 사진이 있다(읽는 사이 올린 사진이 빠진 경우) — 사진 안에 「새 사진 AI 확인」
  const doneIds = state.shots.filter((x) => x.status === 'done').map((x) => x.photoId!);
  const readIds = (state.readOf ?? '').split(',');
  const stale = !!state.read && doneIds.some((id) => !readIds.includes(id));
  return (
    <div id={`slot-${slot}`} className={`${s.slot} ${ready ? s.slotDone : ''} ${busy ? s.slotBusy : ''}`}>
      <div className={s.slotTop}>
        <span className={s.slotN}>{n}</span>
        <span className={`t-strong ${s.slotTitle}`}>{info.title}</span>
      </div>
      <div className={s.slotView}>
        {ready && <span className={`${s.stamp} ${warn ? s.stampWarn : ''}`}>{warn ? '확인!' : '굿'}</span>}
        {/* 장수는 사진 위 왼쪽 위에 겹친다 — 버튼 글자에 넣으면 두 줄이 되어 칸이 커졌다(2026-11-06 사용자 「layout shift 없게」) */}
        {state.shots.length > 0 && !single && <span className={s.slotCount}>{state.shots.length}/{MAX_PER_SLOT}</span>}
        {state.shots.length ? (
          <div className={`${s.shots} ${state.shots.length === 1 ? s.shotsOne : ''}`}>
            {state.shots.map((x) => (
              <div key={x.key} className={`${s.shot} ${x.status === 'error' ? s.shotBad : ''}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={x.preview} alt={`${info.title} 사진`} />
                <button type="button" className={s.shotX} aria-label="이 사진 빼기" disabled={disabled || x.status === 'uploading'} onClick={() => onRemove(x.key)}>✕</button>
              </div>
            ))}
          </div>
        ) : (
          <div className={s.slotArt}><SlotArt slot={slot} /><span className="t-caption c-t3">{info.hint}</span></div>
        )}
        {busy && (
          <div className={s.reading}>
            <span className={s.wobble}><Mascot mood="read" size={56} /></span>
            <span className="t-micro">{state.reading ? (state.shots.some((x) => x.status === 'uploading') ? '읽는 중, 새 사진은 다음에' : 'AI가 째려보는 중') : '올리는 중'}</span>
          </div>
        )}
        {/* 판독을 못 받았을 때만 — 사진 칸 안에 띄운다(아래에 줄을 더해 칸이 커지지 않게) */}
        {!busy && (state.failed || stale) ? (
          <button type="button" className={`${s.reread} ${s.rereadIn}`} onClick={onRetry}>{state.failed ? '다시 읽기' : '새 사진 AI 확인'}</button>
        ) : null}
      </div>
      <div className={s.slotBtns}>
        <button type="button" className={s.slotBtn} disabled={disabled || full} onClick={() => cam.current?.click()}>
          <CameraGlyph /><span>{full ? '꽉 참' : state.shots.length ? (single ? '다시 찍기' : '더 찍기') : '찰칵'}</span>
        </button>
        <button type="button" className={s.slotBtn} disabled={disabled || full} onClick={() => alb.current?.click()}>
          <AlbumGlyph /><span>앨범</span>
        </button>
      </div>
      <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { onPick(e.target.files ?? undefined); e.target.value = ''; }} />
      <input ref={alb} type="file" accept="image/*" multiple={!single} hidden onChange={(e) => { onPick(e.target.files ?? undefined); e.target.value = ''; }} />
    </div>
  );
}

function Note({ lines }: { lines: string[] }) {
  return (
    <div className={s.note}>
      <Mascot mood="oops" size={32} />
      <div>{lines.map((l, i) => <p key={i} className="t-caption">{l}</p>)}</div>
    </div>
  );
}

// ── 내 기록 ────────────────────────────────────────────────────────────────

function Mine({ board, onEdit }: { board: Board | null; onEdit: (id: number) => Promise<void> }) {
  const [opening, setOpening] = useState<number | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  // 무효 · 취소한 제출은 목록에서 내린다(2026-11-06 사용자) — 금액과 건수는 이미 유효 제출만 센다. 몇 건 빠졌는지만 한 줄로.
  // 매 그림마다 새 배열이면 아래 썸네일 effect 가 끝없이 돈다 — 받은 기록이 바뀔 때만 다시 거른다
  const all = board?.me?.items;
  // 무효 처리된 것도 목록에 남긴다 — 흐리게 · 가로줄로 「빠진 것」만 알아보게 하고, 눌러서 고쳐 다시 낼 수 있다(2026-11-06 사용자)
  const items = useMemo(() => all ?? [], [all]);
  useEffect(() => {
    (async () => {
      const m: Record<string, string> = {};
      for (const it of items) m[it.photo_front] = await thumbUrl(it.photo_front);
      setThumbs(m);
    })();
  }, [items]);
  if (!board) return <Loading />;
  const okN = board.me?.count ?? 0;
  return (
    <>
      <section className={`${s.card} ${s.summary}`}>
        <div>
          <p className="t-caption c-t2">내가 잡은 바코드</p>
          <p className={s.bigNum}>{okN}<small>건</small></p>
        </div>
        <div>
          <p className="t-caption c-t2">받을 돈</p>
          <p className={s.bigNum}>{(board.me?.earned_won ?? 0).toLocaleString('ko-KR')}<small>원</small></p>
        </div>
      </section>
      <section className={s.card}>
        <h2 className="t-headline">내 수집 도감</h2>
        {items.length > 0 && <p className="t-caption c-t3">잘못 낸 거 있으면 눌러서 고치거나 취소</p>}
        {items.length === 0 ? (
          <div className={s.empty}><Mascot size={64} /><p className="t-caption c-t3">아직 0개..<br />첫 바코드 사냥 ㄱㄱ</p></div>
        ) : (
          <ul className={s.list}>
            {items.map((it) => {
              const body = (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {thumbs[it.photo_front] ? <img src={thumbs[it.photo_front]} alt="" /> : <span className={s.thumbPh} />}
                  <div className={s.itemText}>
                    <p className={`t-strong ${s.ellipsis}`}>{it.name}</p>
                    <p className={`t-caption c-t3 ${s.ellipsis}`}>{[it.brand, it.barcode].filter(Boolean).join(', ')}</p>
                  </div>
                  <span className={`t-micro c-t3 ${s.itemMeta}`}>
                    {it.status === 'ok' ? it.ts.slice(5, 10).replace('-', '.') : '제외됨'}
                    <span className={s.itemEdit}>{opening === it.id ? '여는 중..' : it.status === 'ok' ? '고치기' : '고쳐서 다시 내기'}</span>
                  </span>
                </>
              );
              return (
                <li key={it.id} className={`${s.item} ${it.status !== 'ok' ? s.itemVoid : ''}`}>
                  <button type="button" className={s.itemBtn} disabled={opening !== null} aria-label={`${it.name} 고치기`}
                    onClick={async () => { setOpening(it.id); try { await onEdit(it.id); } finally { setOpening(null); } }}>
                    {body}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}

// ── 랭킹 ───────────────────────────────────────────────────────────────────

function Rank({ board }: { board: Board | null }) {
  if (!board) return <Loading />;
  const lb = board.leaderboard;
  const top = lb.filter((r) => r.rank <= 3).slice(0, 3);
  const rest = lb.slice(top.length);
  const order = [top[1], top[0], top[2]]; // 단상 자리 고정 — 2등 · 1등 · 3등(빈 자리는 비워 둔다)
  return (
    <>
      <section className={`${s.card} ${s.podiumCard}`}>
        <h2 className="t-headline">명예의 전당, 왕관 쟁탈전</h2>
        {lb.length === 0 ? (
          <div className={s.empty}><Mascot size={64} /><p className="t-caption c-t3">왕관 아직 주인 없음<br />먼저 먹는 사람이 임자</p></div>
        ) : (
          <div className={s.podium}>
            {order.map((r, i) => !r ? <div key={`empty-${i}`} /> : (
              <div key={r.name} className={`${s.pod} ${s[`pod${r.rank}`] ?? ''} ${r.me ? s.podMe : ''}`}>
                <span className={s.crownWrap}><Crown rank={r.rank as 1 | 2 | 3} size={r.rank === 1 ? 40 : 30} /></span>
                <span className={s.avatar}>{r.name.slice(0, 1)}</span>
                <span className={`t-strong ${s.ellipsis}`}>{r.name}</span>
                <span className="t-caption c-t2">{r.count}건</span>
                <div className={s.step}><span>{r.rank}</span></div>
              </div>
            ))}
          </div>
        )}
      </section>
      {rest.length > 0 && (
        <section className={s.card}>
          <ul className={s.list}>
            {rest.map((r) => (
              <li key={r.name} className={`${s.item} ${r.me ? s.itemMe : ''}`}>
                <span className={s.rankN}>{r.rank}</span>
                <span className={s.avatarSm}>{r.name.slice(0, 1)}</span>
                <p className={`t-strong ${s.itemText} ${s.ellipsis}`}>{r.name}{r.me ? ' (나)' : ''}</p>
                <span className="t-strong">{r.count}건</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className={`t-caption c-t3 ${s.foot}`}>다 합쳐서 {board.cap.total} / {board.cap.limit}건, 꽉 차면 끝</p>
    </>
  );
}

function Loading() {
  return <div className={s.center}><span className={s.bob}><Mascot mood="read" size={64} /></span></div>;
}

function Confetti() {
  const bits = useMemo(
    () => Array.from({ length: 36 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.25,
      dur: 1.1 + Math.random() * 0.9,
      rot: Math.random() * 360,
      color: ['var(--brand)', '#f5b62a', 'var(--band-1)', '#7a8fb0', 'var(--tile-sauce-ink)'][i % 5],
      w: 6 + Math.random() * 6,
    })),
    [],
  );
  return (
    <div className={s.confetti} aria-hidden>
      <div className={s.coinPop}><Coin size={56} /></div>
      {bits.map((b, i) => (
        <i key={i} style={{ left: `${b.left}%`, animationDelay: `${b.delay}s`, animationDuration: `${b.dur}s`, background: b.color, width: b.w, height: b.w * 0.5, transform: `rotate(${b.rot}deg)` }} />
      ))}
    </div>
  );
}
