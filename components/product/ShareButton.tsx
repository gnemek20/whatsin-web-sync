'use client';
// 공유 — 휴대폰은 시스템 공유 시트(navigator.share), 없으면 주소를 복사하고 버튼 글자로 알린다.
// 커뮤니티에 제품 판독을 그대로 붙이는 경로라 유입 표시(utm_source=share)를 단다(lib/visit 가 유입 경로로 읽는다).
import { useEffect, useRef, useState } from 'react';
import { Icon } from '../Icon';
import styles from '../PageBar.module.css';

export function ShareButton({ title }: { title: string }) {
  const [done, setDone] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const onClick = async () => {
    const url = new URL(location.href);
    url.search = '';
    url.searchParams.set('utm_source', 'share');
    const href = url.toString();
    try {
      if (navigator.share) {
        await navigator.share({ title: `${title} | What's In?`, url: href });
        return;
      }
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') return; // 사용자가 시트를 닫음
    }
    try {
      await navigator.clipboard.writeText(href);
      setDone(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setDone(false), 1800);
    } catch {}
  };
  return (
    <button type="button" className={styles.pill} onClick={onClick} aria-label="이 제품 공유">
      {done ? <Icon name="check" size={20} /> : <Icon name="share" size={20} />}
      <span>{done ? '주소 복사 완료' : '공유'}</span>
    </button>
  );
}
