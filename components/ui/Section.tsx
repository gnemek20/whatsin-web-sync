// 섹션 — 제목(용도별 한 가지 글자) + 오른쪽 동작(더 보기 · 지우기) + 설명 한 줄 + 본문. 2026-11-13 디자인 규칙 정리.
//   level 'section'(기본) = t-headline · 화면의 큰 덩어리(최근 검색 · 다른 선택 · 원재료 …)
//   level 'sub' = t-strong · 섹션 안의 작은 묶음(사전의 「대체당」 · 커뮤니티 댓글 …)
// 제목 → 본문 간격은 --s-head, 섹션 사이 간격은 부모(.layout-main · .layout-side · .stack-group)의 --s-group 이 맡는다.
import s from './ui.module.css';

export function Section({
  title,
  id,
  sub,
  action,
  level = 'section',
  className,
  children,
}: {
  title: React.ReactNode;
  id?: string;
  sub?: React.ReactNode;
  action?: React.ReactNode;
  level?: 'section' | 'sub';
  className?: string;
  children?: React.ReactNode;
}) {
  const H = level === 'section' ? 'h2' : 'h3';
  return (
    <section className={`${s.section} ${className ?? ''}`} aria-labelledby={id}>
      <div className={s.head}>
        <div className={s.headText}>
          <H id={id} className={level === 'section' ? s.title : s.subTitle}>{title}</H>
          {sub ? <p className="t-caption c-t3">{sub}</p> : null}
        </div>
        {action ? <div className={s.action}>{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
