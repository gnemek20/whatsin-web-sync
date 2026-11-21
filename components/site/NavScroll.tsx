'use client';
// 머리 바가 맨 위에 있는지 — 내려가면 <html data-scrolled> 를 붙여 선 · 흐림을 켠다(Nav.module.css).
import { useEffect } from 'react';

export function NavScroll() {
  useEffect(() => {
    const root = document.documentElement;
    const on = () => {
      if (window.scrollY > 4) root.dataset.scrolled = '';
      else delete root.dataset.scrolled;
    };
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return null;
}
