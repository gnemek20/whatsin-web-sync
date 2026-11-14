'use client';
// 스크롤 등장 — [data-reveal] 이 화면에 들어오면 .is-in 을 단다(400 ms 이하 · CSS 가 움직인다).
// html 에 .js-reveal 을 다는 것도 여기서 한다 — JS 가 없거나 늦으면 내용은 처음부터 보인다.
// prefers-reduced-motion 이면 아무것도 하지 않는다.
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

export function Reveal() {
  const path = usePathname();
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!('IntersectionObserver' in window)) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-in)'));
    // 이미 화면 안에 있는 것은 숨기지 않는다(깜빡임 방지).
    const vh = window.innerHeight;
    els.forEach((el) => {
      if (el.getBoundingClientRect().top < vh * 0.92) el.classList.add('is-in');
    });
    document.documentElement.classList.add('js-reveal');
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    els.forEach((el) => {
      if (!el.classList.contains('is-in')) io.observe(el);
    });
    return () => io.disconnect();
  }, [path]);
  return null;
}
