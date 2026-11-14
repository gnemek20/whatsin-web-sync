// 목록 카드 — 한 장의 카드 안에 줄을 나눠 담는다(검색 예시 · 최근 검색 · 둘러보기 · 커뮤니티 꿀팁 …). 2026-11-13 디자인 규칙 정리.
// 줄: [앞(아이콘 · 타일)] 제목(t-strong) + 보조 줄(t-caption) [뒤(꺾쇠 · 지우기)]. 줄 높이와 안쪽 여백은 여기 한 곳.
import Link from 'next/link';
import { Icon } from '../Icon';
import s from './ui.module.css';

export function ListCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return <ul className={`card ${s.list} ${className ?? ''}`}>{children}</ul>;
}

export function ListRow({
  href,
  title,
  sub,
  leading,
  trailing,
  chevron = !!href,
}: {
  href?: string;
  title: React.ReactNode;
  sub?: React.ReactNode;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  chevron?: boolean;
}) {
  const body = (
    <>
      {leading ? <span className={s.leading}>{leading}</span> : null}
      <span className={s.rowText}>
        <span className={`t-strong ${s.rowTitle}`}>{title}</span>
        {sub ? <span className={`t-caption c-t3 ${s.rowSub}`}>{sub}</span> : null}
      </span>
      {chevron ? <Icon name="next" size={16} className={`c-t3 ${s.chev}`} /> : null}
    </>
  );
  return (
    <li className={s.item}>
      {href ? <Link href={href} className={s.row}>{body}</Link> : <div className={s.row}>{body}</div>}
      {trailing ? <span className={s.trailing}>{trailing}</span> : null}
    </li>
  );
}

/** 섹션 머리 오른쪽의 작은 글자 단추 · 링크(더 보기 · 지우기). */
export function TextAction({ href, onClick, children }: { href?: string; onClick?: () => void; children: React.ReactNode }) {
  return href ? (
    <Link href={href} className={`t-caption ${s.textAction}`}>{children}</Link>
  ) : (
    <button type="button" className={`t-caption ${s.textAction}`} onClick={onClick}>{children}</button>
  );
}
