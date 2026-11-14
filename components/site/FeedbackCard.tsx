'use client';
// 서비스 별점 · 의견 창 본체 — 뜰 때가 되어서야 받는다(FeedbackPrompt 의 next/dynamic). 모든 화면의 첫 번들에서 뺀다.
import { useEffect, useRef, useState } from 'react';
import { CLIENT_API as API_BASE } from '@/lib/config';
import { deviceKey } from '@/lib/visit';
import { Icon } from '../Icon';
import styles from './FeedbackPrompt.module.css';

const DONE = 'wi_fb_done';         // localStorage — 보낸 날(ms)
const LABELS = ['', '별로', '아쉬움', '보통', '좋음', '최고'];

export default function FeedbackCard({ mobile, trigger, onClose }: { mobile: boolean; trigger: 'pc_timer' | 'mobile_usage'; onClose: () => void }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  // 모바일 모달이 열리면 뒤 화면이 굴러가지 않게
  useEffect(() => {
    if (!mobile) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [mobile]);

  const close = onClose;
  const snooze = onClose;
  const send = async () => {
    if (!rating || state === 'sending') return;
    setState('sending');
    try {
      await fetch(`${API_BASE}/feedback`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ device_key: await deviceKey(), platform: 'web', rating, comment: text.trim() || null, page: location.pathname + location.search, device: navigator.userAgent.slice(0, 110), trigger }),
      });
    } catch {}
    try { localStorage.setItem(DONE, String(Date.now())); } catch {}
    setState('done');
    timer.current = window.setTimeout(close, 1800);
  };

  const shown = hover || rating;
  const card = (
    <div className={`${styles.card} ${mobile ? styles.cardModal : styles.cardCorner}`} role="dialog" aria-modal={mobile} aria-labelledby="fb-title">
      <button type="button" className={styles.x} aria-label="닫기" onClick={close}><Icon name="close" size={20} /></button>
      {state === 'done' ? (
        <div className={styles.thanks}>
          <span className={styles.thanksIcon}><Icon name="check" size={24} /></span>
          <p className="t-headline">의견 고맙습니다</p>
          <p className="t-caption c-t2">다음 업데이트에 반영합니다</p>
        </div>
      ) : (
        <>
          <div className={styles.head}>
            <p id="fb-title" className="t-headline">와츠인 만족도</p>
            <p className="t-caption c-t2">별점 하나, 한 줄 의견이면 충분합니다</p>
          </div>
          <div className={styles.stars} role="radiogroup" aria-label="별점" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n}점`}
                className={`${styles.star} ${n <= shown ? styles.starOn : ''}`}
                onMouseEnter={() => setHover(n)}
                onClick={() => setRating(n)}
              >
                <svg viewBox="0 0 24 24" width="32" height="32" aria-hidden>
                  <path d="M12 3.2l2.6 5.5 6 .8-4.4 4.1 1.1 5.9L12 16.6l-5.3 2.9 1.1-5.9L3.4 9.5l6-.8z" />
                </svg>
              </button>
            ))}
            <span className={`t-caption c-t2 ${styles.starLabel}`}>{LABELS[shown] || '별점 선택'}</span>
          </div>
          <textarea
            className={styles.text}
            rows={3}
            maxLength={2000}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="좋았던 점, 불편한 점, 건의사항"
            aria-label="의견"
          />
          <div className={styles.actions}>
            <button type="button" className={styles.snooze} onClick={snooze}>이번 접속 중 숨김</button>
            <button type="button" className={styles.send} disabled={!rating || state === 'sending'} onClick={send}>
              {state === 'sending' ? '보내는 중' : '보내기'}
            </button>
          </div>
        </>
      )}
    </div>
  );
  // 모바일 마스크 — 눌러도 닫히지 않는다(사용자 결정). 일부러 onClick 이 없다.
  return mobile ? <div className={styles.mask}>{card}</div> : card;
}
