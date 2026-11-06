import Link from 'next/link';
import { EmptyState } from '@/components/States';

export default function NotFound() {
  return (
    <main className="container" style={{ paddingBottom: 'var(--s-band)', paddingTop: 'var(--s-stack)' }}>
      <EmptyState title="없는 페이지" body="주소가 바뀌었거나 자료에 없는 페이지입니다.">
        <Link
          href="/search"
          className="t-strong"
          style={{ color: 'var(--brand-ink)', marginTop: 'var(--s-tight)' }}
        >
          검색으로
        </Link>
      </EmptyState>
    </main>
  );
}
