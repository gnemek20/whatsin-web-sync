'use client';
// 테마 고르기 — 해(라이트) · 달(다크 · 애쉬 팔레트) · 모니터(기기 설정을 따름 · 기본)(2026-11-03 사용자).
// 고른 값은 이 기기의 localStorage(wi_theme)에만 두고 <html data-theme> 로 건다. 시스템이면 data-theme 를 지워 globals.css 의
// prefers-color-scheme 규칙이 그대로 돈다. 첫 화면 깜빡임은 layout 의 THEME_BOOT 스크립트가 그리기 전에 막는다.
import { useEffect, useState } from 'react';
import { Icon } from './Icon';
import styles from './ThemeToggle.module.css';

export type ThemeChoice = 'light' | 'dark' | 'system';
const KEY = 'wi_theme';
const BG = { light: '#f4f4f2', dark: '#181818' };

/** layout <head> 에 그대로 넣는 스크립트 — React 보다 먼저 돌아 고른 테마로 첫 화면을 그린다. */
export const THEME_BOOT = `try{var t=localStorage.getItem('${KEY}');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;

function apply(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === 'system') delete root.dataset.theme;
  else root.dataset.theme = choice;
  const dark = choice === 'dark' || (choice === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  // 주소창 색 — viewport.themeColor(시스템 기준)를 고른 테마에 맞춘다
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', dark ? BG.dark : BG.light));
}

const OPTIONS: { value: ThemeChoice; icon: 'sun' | 'moon' | 'system'; label: string }[] = [
  { value: 'light', icon: 'sun', label: '라이트' },
  { value: 'dark', icon: 'moon', label: '다크' },
  { value: 'system', icon: 'system', label: '시스템 설정' },
];

// compact — 한 칸 단추(누를 때마다 라이트 → 다크 → 시스템). 좁은 화면 머리에 쓴다.
export function ThemeToggle({ className, compact = false }: { className?: string; compact?: boolean }) {
  const [choice, setChoice] = useState<ThemeChoice>('system');

  useEffect(() => {
    let saved: ThemeChoice = 'system';
    try {
      const v = localStorage.getItem(KEY);
      if (v === 'light' || v === 'dark') saved = v;
    } catch {}
    setChoice(saved);
    apply(saved);
    // 시스템을 따르는 동안 기기 설정이 바뀌면 주소창 색도 따라간다
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      try {
        if (!localStorage.getItem(KEY)) apply('system');
      } catch {
        apply('system');
      }
    };
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  const pick = (v: ThemeChoice) => {
    setChoice(v);
    apply(v);
    try {
      if (v === 'system') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, v);
    } catch {}
  };

  if (compact) {
    const i = OPTIONS.findIndex((o) => o.value === choice);
    const cur = OPTIONS[i < 0 ? 2 : i];
    const next = OPTIONS[(i + 1) % OPTIONS.length];
    return (
      <button
        type="button"
        className={`${styles.one} ${className ?? ''}`}
        onClick={() => pick(next.value)}
        aria-label={`화면 테마: ${cur.label}. 누르면 ${next.label}`}
        title={`화면 테마: ${cur.label}`}
      >
        <Icon name={cur.icon} size={18} />
      </button>
    );
  }

  return (
    <div role="radiogroup" aria-label="화면 테마" className={`${styles.group} ${className ?? ''}`} data-noswipe>
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={choice === o.value}
          aria-label={o.label}
          title={o.label}
          className={`${styles.opt} ${choice === o.value ? styles.on : ''}`}
          onClick={() => pick(o.value)}
        >
          <Icon name={o.icon} size={16} />
        </button>
      ))}
    </div>
  );
}
