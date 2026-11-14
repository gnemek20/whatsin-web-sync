'use client';
// 오류 신고 창 — 상세 맨 아래 「정보가 다른가요?」(2026-11-04 사용자 「앱과 웹 모두」). 받는 곳 POST /reports(backend/app/db/reports.py) ·
// 처리는 admin 「오류 신고」 탭. 창 모양은 서비스 평가 창(site/FeedbackPrompt)과 같다.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../Icon';
import { CLIENT_API as API_BASE } from '@/lib/config';
import { deviceKey } from '@/lib/visit';
import fb from '../site/FeedbackPrompt.module.css';
import styles from './product.module.css';

// 서버 Report.kind 와 같은 키 · 앱 components/ReportSheet 와 같은 말
const KINDS: [string, string][] = [
  ['nutrition', '영양성분'],
  ['ingredients', '원재료'],
  ['name', '이름, 제조사'],
  ['barcode', '바코드'],
  ['image', '사진'],
  ['verdict', '판정'],
  ['other', '기타'],
];

// 창 본체 — 「오류 신고」를 누른 뒤에야 받는다(ReportButton 의 next/dynamic). 상세 화면 첫 번들에 들어가지 않는다.
export default function ReportSheet({ id, name, onClose }: { id: string; name: string; onClose: () => void }) {
  const [kind, setKind] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [contact, setContact] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'fail'>('idle');

  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
      window.clearTimeout(timer.current); // 닫힌 뒤 「고맙습니다」 타이머가 남지 않게
    };
  }, [onClose]);

  const close = onClose;
  const send = async () => {
    if (!kind || state === 'sending') return;
    setState('sending');
    try {
      const r = await fetch(`${API_BASE}/reports`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          device_key: await deviceKey(), platform: 'web', product_id: id, product_name: name, kind,
          message: text.trim() || null, contact: contact.trim() || null, page: location.pathname, device: navigator.userAgent.slice(0, 110),
        }),
      });
      const j = await r.json().catch(() => ({}));
      setState(r.ok && j.ok ? 'done' : 'fail');
      if (r.ok && j.ok) timer.current = window.setTimeout(onClose, 1800);
    } catch {
      setState('fail');
    }
  };

  return createPortal(
            <div className={fb.mask} onClick={(e) => e.target === e.currentTarget && close()}>
              <div className={`${fb.card} ${fb.cardModal}`} role="dialog" aria-modal aria-labelledby="rp-title">
                <button type="button" className={fb.x} aria-label="닫기" onClick={close}><Icon name="close" size={20} /></button>
                {state === 'done' ? (
                  <div className={fb.thanks}>
                    <span className={fb.thanksIcon}><Icon name="check" size={24} /></span>
                    <p className="t-headline">신고 고맙습니다</p>
                    <p className="t-caption c-t2">확인 후 고칩니다.</p>
                  </div>
                ) : (
                  <>
                    <div className={fb.head}>
                      <p id="rp-title" className="t-headline">오류 신고</p>
                      <p className="t-caption c-t2">{name}</p>
                    </div>
                    <div className={styles.reportKinds} role="radiogroup" aria-label="다른 항목">
                      {KINDS.map(([k, l]) => (
                        <button key={k} type="button" role="radio" aria-checked={kind === k}
                          className={`t-caption ${styles.reportKind} ${kind === k ? styles.reportKindOn : ''}`} onClick={() => setKind(k)}>
                          {l}
                        </button>
                      ))}
                    </div>
                    <textarea className={fb.text} rows={3} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)}
                      placeholder="무엇이 어떻게 다른지(예: 포장엔 당류 12g)" aria-label="내용" />
                    <input className={fb.text} style={{ minHeight: 0, height: 48 }} type="email" maxLength={120} value={contact}
                      onChange={(e) => setContact(e.target.value)} placeholder="답장 받을 이메일(선택)" aria-label="이메일" />
                    {state === 'fail' ? <p className="t-caption c-t2">보내지 못했습니다. 잠시 뒤 다시 시도해 주시기 바랍니다.</p> : null}
                    <div className={fb.actions}>
                      <span className="t-caption c-t3">{kind ? '' : '다른 항목 선택'}</span>
                      <button type="button" className={fb.send} disabled={!kind || state === 'sending'} onClick={send}>
                        {state === 'sending' ? '보내는 중' : '보내기'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>,
            document.body,
  );
}
