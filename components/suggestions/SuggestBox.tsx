'use client';
// 건의함(2026-11-19 사용자 「헤더 성분 사전 오른쪽으로 건의함」) — 종류 고르기(칸 격자) · 내용 · 보내기 · 보낸 건의(처리 상태).
//   받는 곳 POST /suggestions(backend/app/db/suggestions.py) · 처리는 admin 「건의함」 탭(새 건의 · 읽음 · 반영함).
//   이름 · 연락처는 받지 않는다 — 「보낸 건의」 목록에 처리 상태와 운영자와의 대화를 돌려 보인다(같은 기기 키 · GET /suggestions/mine).
//   대화(2026-11-19 사용자 「답변 받으면 그대로 끝난다 — 후속으로 계속 대화를」) — 운영자 답변은 왼쪽(와츠인), 내가 이어 쓴 말은 오른쪽(나).
//   건의마다 「답글 쓰기」를 누르면 그 자리에 입력칸이 열린다(POST /suggestions/{id}/messages). 처음 보는 답변은 「새 답변」(이 브라우저 localStorage).
//   말이 오간 건의가 위로 온다(서버가 마지막 말 시각으로 정렬).
//   레이아웃 고정 — 종류마다 바뀌는 안내 줄 · 보내기 옆 결과 줄은 자리를 늘 두고 글만 바꾼다(밀림 금지).
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CLIENT_API } from '@/lib/config';
import { deviceKey } from '@/lib/visit';
import { Icon, type IconName } from '../Icon';
import s from './suggest.module.css';

type Kind = 'feature' | 'data' | 'product' | 'etc';
type Status = 'new' | 'read' | 'done';
type Msg = { id: number; ts: string; who: 'admin' | 'user'; body: string };
type Sent = { id: number; ts: string; kind: Kind; body: string; status: Status; messages: Msg[] };

// 이 브라우저에서 이미 본 운영자 답변(건의 번호 → 마지막으로 본 답변 번호) — 「새 답변」 표시용. 저장소가 막혀도 화면은 그대로 돈다.
const SEEN = 'wi_sg_seen';
function readSeen(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(SEEN) || '{}') || {};
  } catch {
    return {};
  }
}
function writeSeen(v: Record<string, number>) {
  try {
    localStorage.setItem(SEEN, JSON.stringify(v));
  } catch {}
}
const lastAdmin = (x: Sent) => x.messages.reduce((m, y) => (y.who === 'admin' ? Math.max(m, y.id) : m), 0);

const KINDS: { id: Kind; label: string; sub: string; icon: IconName; hint: string }[] = [
  { id: 'feature', label: '기능 제안', sub: '있으면 좋겠는 것', icon: 'plus', hint: '있으면 좋겠는 기능이나 불편했던 점을 적어 주세요.' },
  { id: 'data', label: '정보 오류', sub: '틀린 성분, 영양 값', icon: 'alert', hint: '한 제품만 틀렸다면 제품 화면 맨 아래 「오류 신고」가 더 빠릅니다.' },
  { id: 'product', label: '제품 요청', sub: '찾는 제품이 없어요', icon: 'search', hint: '제품 이름과 회사를 적어 주세요. 바코드 숫자가 있으면 더 빨리 찾습니다.' },
  { id: 'etc', label: '그 밖의 의견', sub: '무엇이든', icon: 'message', hint: '그 밖에 하고 싶은 말을 자유롭게 적어 주세요.' },
];
const KIND_LABEL = Object.fromEntries(KINDS.map((k) => [k.id, k.label])) as Record<Kind, string>;
const STATUS_LABEL: Record<Status, string> = { new: '보냄', read: '읽음', done: '반영함' };
const MAX = 1000;

const when = (ts: string) => {
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? '' : new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
};

export function SuggestBox() {
  const [kind, setKind] = useState<Kind>('feature');
  const [body, setBody] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'limit' | 'fail'>('idle');
  const [sent, setSent] = useState<Sent[] | null>(null);
  const [fresh, setFresh] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${CLIENT_API}/suggestions/mine?device_key=${encodeURIComponent(await deviceKey())}`, { cache: 'no-store' });
      const items: Sent[] = r.ok ? (await r.json()).items ?? [] : [];
      setSent(items);
      // 처음 보는 답변 — 이번에 보여 주고 본 것으로 적는다(다음 방문부터는 표시 없음)
      const seen = readSeen();
      const next = new Set<number>();
      for (const x of items) {
        const a = lastAdmin(x);
        if (a > (seen[x.id] ?? 0)) next.add(x.id);
        if (a) seen[x.id] = a;
      }
      setFresh((prev) => new Set([...prev, ...next]));
      writeSeen(seen);
    } catch {
      setSent([]);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const text = body.trim();
  const ok = text.length > 0 && state !== 'sending'; // 글자 수 하한 없음(2026-11-19 사용자) — 비어 있지만 않으면
  const send = async () => {
    if (!ok) return;
    setState('sending');
    try {
      const r = await fetch(`${CLIENT_API}/suggestions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ device_key: await deviceKey(), platform: 'web', kind, body: text, page: location.pathname, device: navigator.userAgent.slice(0, 110) }),
      });
      const j = r.ok ? await r.json() : null;
      if (j?.ok) {
        setBody('');
        setState('done');
        load();
      } else setState(r.ok ? 'limit' : 'fail');
    } catch {
      setState('fail');
    }
  };

  const hint = KINDS.find((k) => k.id === kind)!.hint;
  const result =
    state === 'done' ? '보냈습니다. 답변은 아래 「보낸 건의」에 달리고, 거기서 이어서 대화할 수 있습니다.'
    : state === 'limit' ? '오늘은 더 보낼 수 없습니다. 내일 다시 보내 주세요.'
    : state === 'fail' ? '보내지 못했습니다. 잠시 뒤 다시 보내 주세요.'
    : '';

  return (
    <div className={s.wrap}>
      <div className={`card ${s.form}`}>
        <div className={s.field}>
          <span id="sg-kind" className={`t-strong ${s.label}`}>무엇에 대한 건의인가요?</span>
          <div className={s.kinds} role="radiogroup" aria-labelledby="sg-kind">
            {KINDS.map((k) => {
              const on = kind === k.id;
              return (
                <button
                  key={k.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  className={`${s.kind} ${on ? s.kindOn : ''}`}
                  onClick={() => {
                    setKind(k.id);
                    if (state !== 'sending') setState('idle');
                  }}
                >
                  <span className={s.kindIcon} aria-hidden>
                    <Icon name={k.icon} size={20} />
                  </span>
                  <span className={s.kindText}>
                    <span className={s.kindLabel}>{k.label}</span>
                    <span className={s.kindSub}>{k.sub}</span>
                  </span>
                  <span className={s.kindCheck} aria-hidden>
                    <Icon name="check" size={16} strokeWidth={2.2} />
                  </span>
                </button>
              );
            })}
          </div>
          <p className={`t-caption ${s.hint}`} aria-live="polite">
            <Icon name="info" size={16} />
            <span>{hint}</span>
          </p>
        </div>

        <label className={s.field}>
          <span className={s.labelRow}>
            <span className={`t-strong ${s.label}`}>내용</span>
            <span className="t-caption c-t3 num">
              {body.length}/{MAX}
            </span>
          </span>
          <textarea
            className={s.input}
            rows={7}
            value={body}
            maxLength={MAX}
            placeholder="내용"
            onChange={(e) => {
              setBody(e.target.value);
              if (state !== 'idle' && state !== 'sending') setState('idle');
            }}
          />
        </label>

        <div className={s.foot}>
          <p className={`t-caption ${state === 'done' ? s.resultOk : state === 'limit' || state === 'fail' ? s.resultBad : 'c-t3'} ${s.result}`} role="status">
            {result || '이름이나 연락처는 받지 않습니다.'}
          </p>
          <button type="button" className={`btn btn-primary ${s.send}`} onClick={send} disabled={!ok}>
            {state === 'sending' ? '보내는 중' : '보내기'}
          </button>
        </div>
      </div>

      <section className={s.sent} aria-labelledby="sg-sent">
        <div className={s.sentHead}>
          <h2 id="sg-sent" className="t-headline">보낸 건의</h2>
          <span className="t-caption c-t3">이 브라우저에서 보낸 것</span>
        </div>
        {sent === null ? (
          <div className={`card ${s.sentEmpty}`} aria-busy />
        ) : sent.length === 0 ? (
          <div className={`card ${s.sentEmpty}`}>
            <p className="t-body c-t2">아직 보낸 건의가 없습니다.</p>
            <p className="t-caption c-t3">
              먼저 둘러보고 싶다면 <Link href="/community">커뮤니티</Link>에서 다른 사람들의 이야기를 볼 수 있습니다.
            </p>
          </div>
        ) : (
          <ul className={`card ${s.sentList}`}>
            {sent.map((x) => (
              <Thread key={x.id} x={x} fresh={fresh.has(x.id)} onSent={load} />
            ))}
          </ul>
        )}
        <p className={`t-caption c-t3 ${s.legend}`}>
          보냄은 아직 읽기 전, 읽음은 확인한 것, 반영함은 서비스에 고쳐 넣은 것입니다. 답변이 달리면 그 건의 아래에 보이고, 「답글 쓰기」로 이어서 물어볼 수 있습니다.
        </p>
      </section>
    </div>
  );
}

/** 건의 하나 — 첫 글 · 대화 · 답글 쓰기. 입력칸은 「답글 쓰기」를 눌러야 열린다(목록이 길어도 칸이 줄지어 늘어서지 않게). */
function Thread({ x, fresh, onSent }: { x: Sent; fresh: boolean; onSent: () => Promise<void> | void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'limit' | 'fail'>('idle');
  const box = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (open) box.current?.focus();
  }, [open]);
  const t = text.trim();
  const send = async () => {
    if (!t || state === 'sending') return;
    setState('sending');
    try {
      const r = await fetch(`${CLIENT_API}/suggestions/${x.id}/messages`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ device_key: await deviceKey(), body: t }),
      });
      const j = r.ok ? await r.json() : null;
      if (j?.ok) {
        setText('');
        setOpen(false);
        setState('idle');
        await onSent();
      } else setState(j?.reason === 'limit' ? 'limit' : 'fail');
    } catch {
      setState('fail');
    }
  };
  const waiting = !x.messages.length || x.messages[x.messages.length - 1].who === 'user';
  return (
    <li className={s.sentRow}>
      <div className={s.sentMeta}>
        <span className={s.sentKind}>{KIND_LABEL[x.kind] ?? '건의'}</span>
        <span className="t-caption c-t3 num">{when(x.ts)}</span>
        {fresh ? <span className={s.freshTag}>새 답변</span> : null}
        <span className={`${s.status} ${s[`st_${x.status}`] ?? ''}`}>{STATUS_LABEL[x.status] ?? x.status}</span>
      </div>
      <p className={`t-body ${s.sentBody}`}>{x.body}</p>
      {x.messages.length ? (
        <ol className={s.thread} aria-label="대화">
          {x.messages.map((m) => (
            <li key={m.id} className={`${s.msg} ${m.who === 'admin' ? s.msgAdmin : s.msgMe}`}>
              <div className={s.msgHead}>
                <span className={s.msgWho}>
                  {m.who === 'admin' ? <Icon name="message" size={16} /> : null}
                  {m.who === 'admin' ? '와츠인' : '나'}
                </span>
                <span className="t-caption c-t3 num">{when(m.ts)}</span>
              </div>
              <p className={`t-body ${s.msgBody}`}>{m.body}</p>
            </li>
          ))}
        </ol>
      ) : null}
      {open ? (
        <div className={s.follow}>
          <textarea
            ref={box}
            className={`${s.input} ${s.followInput}`}
            rows={3}
            value={text}
            maxLength={MAX}
            placeholder="답글"
            aria-label="답글"
            onChange={(e) => {
              setText(e.target.value);
              if (state !== 'sending') setState('idle');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send();
            }}
          />
          <div className={s.followFoot}>
            <span className={`t-caption ${state === 'idle' || state === 'sending' ? 'c-t3' : s.resultBad}`} role="status">
              {state === 'limit' ? '오늘은 더 보낼 수 없습니다.' : state === 'fail' ? '보내지 못했습니다. 잠시 뒤 다시 보내 주세요.' : `${text.length}/${MAX}`}
            </span>
            <span className={s.followBtns}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
                취소
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={send} disabled={!t || state === 'sending'}>
                {state === 'sending' ? '보내는 중' : '보내기'}
              </button>
            </span>
          </div>
        </div>
      ) : (
        <div className={s.rowFoot}>
          <span className="t-caption c-t3">{waiting ? '답변을 기다리고 있습니다.' : '더 궁금한 점이 있으면 이어서 물어보세요.'}</span>
          <button type="button" className={`btn btn-ghost btn-sm ${s.followOpen}`} onClick={() => setOpen(true)}>
            <Icon name="edit" size={16} />
            답글 쓰기
          </button>
        </div>
      )}
    </li>
  );
}
