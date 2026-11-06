'use client';
// 이전 페이지로 — 제품 상세에만 둔다(2026-11-06 사용자 「제품 상세에서 이전으로 돌아가는 용도로만」 · 11-05 「모든 페이지에 하나씩」을 좁힘).
// 같은 사이트에서 왔으면 브라우저 기록으로 돌아가고(스크롤 · 입력 그대로), 밖에서 바로 들어왔으면(공유 링크 · 검색엔진) fallback 으로 간다.
// 자바스크립트 전에는 평범한 링크(fallback)다. 모양은 화면 맨 위 줄(PageBar)의 알약과 같다(2026-11-06).
import { useRouter } from 'next/navigation';
import type { MouseEvent } from 'react';
import { Icon } from './Icon';
import styles from './PageBar.module.css';

export function BackButton({ fallback = '/search', label = '이전', className }: { fallback?: string; label?: string; className?: string }) {
  const router = useRouter();
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // 새 탭 열기는 그대로
    let sameSite = false;
    try {
      sameSite = !!document.referrer && new URL(document.referrer).origin === window.location.origin;
    } catch {
      sameSite = false;
    }
    if (sameSite && window.history.length > 1) {
      e.preventDefault();
      router.back();
    }
  };
  return (
    <a href={fallback} onClick={onClick} className={`${styles.pill} ${className ?? ''}`} aria-label="이전 페이지로">
      <Icon name="back" size={20} />
      <span>{label}</span>
    </a>
  );
}
