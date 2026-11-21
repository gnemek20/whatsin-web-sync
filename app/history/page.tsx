// 기록 탭(2026-11-17) — 본 제품 · 찾은 말(이 브라우저에만). 화면은 components/history/History.
import type { Metadata } from 'next';
import { History } from '@/components/history/History';
import { DockSearch } from '@/components/shell/DockSearch';
import s from '@/components/history/history.module.css';

export const metadata: Metadata = { title: '기록' };

export default function HistoryPage() {
  return (
    <main className={s.screen}>
      <div className={`container ${s.wrap}`}>
        <History />
      </div>
      <DockSearch spacer />
    </main>
  );
}
