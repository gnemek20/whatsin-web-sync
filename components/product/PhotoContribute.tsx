'use client';
// 제품 사진 올리기(2026-11-18 사용자 「대표 이미지 없는 제품은 직접 기여해서 이미지를 달 수 있는 명시적인 버튼」).
//   대표 사진이 없는 제품의 상세에만 보인다. 사진을 고르면(모바일은 카메라 · 앨범) 브라우저에서 긴 변 1,600px JPEG 로 줄여
//   POST /reports/photo 로 보낸다 — 서버는 kind='image' 신고 한 줄 + 사진 파일(backend/app/db/reports.py).
//   바로 붙지 않는다: 사람이 admin 「오류 신고」에서 사진을 보고 반영한다(제품 DB 는 읽기 전용) — 화면에도 그렇게 말한다.
//   창 모양은 오류 신고 창(ReportSheet)과 같다. 행동 기록 photo_open · photo_send.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../Icon';
import { CLIENT_API as API_BASE } from '@/lib/config';
import { deviceKey } from '@/lib/visit';
import { track } from '@/lib/track';
import fb from '../site/FeedbackPrompt.module.css';
import s from './photo.module.css';

const MAX = 1600;

async function shrink(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, no) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = no;
      i.src = url;
    });
    const k = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * k);
    c.height = Math.round(img.naturalHeight * k);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.88);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function PhotoContribute({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={`btn btn-ghost btn-block ${s.openBtn}`} onClick={() => { setOpen(true); track({ name: 'photo_open', product_id: id }); }}>
        <Icon name="plus" size={18} />
        제품 사진 올리기
      </button>
      {open ? <Sheet id={id} name={name} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function Sheet({ id, name, onClose }: { id: string; name: string; onClose: () => void }) {
  const [img, setImg] = useState<string | null>(null);
  const [state, setState] = useState<'idle' | 'reading' | 'sending' | 'done' | 'fail' | 'limit'>('idle');
  const input = useRef<HTMLInputElement>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
      window.clearTimeout(timer.current);
    };
  }, [onClose]);

  const pick = async (f?: File | null) => {
    if (!f) return;
    setState('reading');
    try {
      setImg(await shrink(f));
      setState('idle');
    } catch {
      setState('fail');
    }
  };
  const send = async () => {
    if (!img || state === 'sending') return;
    setState('sending');
    try {
      const r = await fetch(`${API_BASE}/reports/photo`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ device_key: await deviceKey(), platform: 'web', product_id: id, product_name: name, image: img, page: location.pathname, device: navigator.userAgent.slice(0, 110) }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) {
        setState('done');
        track({ name: 'photo_send', product_id: id });
        timer.current = window.setTimeout(onClose, 2200);
      } else setState(j.reason === 'limit' ? 'limit' : 'fail');
    } catch {
      setState('fail');
    }
  };

  return createPortal(
    <div className={fb.mask} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`${fb.card} ${fb.cardModal}`} role="dialog" aria-modal aria-labelledby="ph-title">
        <button type="button" className={fb.x} aria-label="닫기" onClick={onClose}><Icon name="close" size={20} /></button>
        {state === 'done' ? (
          <div className={fb.thanks}>
            <span className={fb.thanksIcon}><Icon name="check" size={24} /></span>
            <p className="t-headline">사진 고맙습니다</p>
            <p className="t-caption c-t2">확인한 뒤 이 제품의 대표 사진으로 씁니다.</p>
          </div>
        ) : (
          <>
            <div className={fb.head}>
              <p id="ph-title" className="t-headline">제품 사진 올리기</p>
              <p className="t-caption c-t2">{name}</p>
            </div>
            <button type="button" className={`${s.drop} ${img ? s.dropHas : ''}`} onClick={() => input.current?.click()} aria-label={img ? '다른 사진 고르기' : '사진 고르기'}>
              {img ? (
                // eslint-disable-next-line @next/next/no-img-element -- 고른 사진 미리보기(data URL)
                <img src={img} alt="" className={s.preview} />
              ) : (
                <span className={s.dropEmpty}>
                  <span className={s.dropIcon}><Icon name="plus" size={24} /></span>
                  <span className="t-strong">{state === 'reading' ? '사진을 읽는 중' : '사진 고르기'}</span>
                  <span className="t-caption c-t3">포장 앞면이 잘 보이게 찍어 주세요</span>
                </span>
              )}
            </button>
            <input ref={input} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
            <p className="t-caption c-t3">올린 사진은 확인을 거쳐 와츠인의 제품 사진으로 쓰입니다. 사람 얼굴이나 개인 정보가 보이지 않게 찍어 주세요.</p>
            {state === 'fail' ? <p className="t-caption c-t2">보내지 못했습니다. 다른 사진으로 다시 시도해 주세요.</p> : null}
            {state === 'limit' ? <p className="t-caption c-t2">오늘은 더 올릴 수 없습니다. 내일 다시 시도해 주세요.</p> : null}
            <div className={fb.actions}>
              <span className="t-caption c-t3">{img ? '' : '사진을 골라 주세요'}</span>
              <button type="button" className={fb.send} disabled={!img || state === 'sending' || state === 'reading'} onClick={send}>
                {state === 'sending' ? '보내는 중' : '올리기'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
