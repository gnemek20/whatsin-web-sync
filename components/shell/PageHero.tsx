// 새 화면(비교 · 커뮤니티 · 성분 사전)의 머리 — 2026-11-14 디자인 v4. 검색 첫 면과 같은 짜임(작은 브랜드 글자 + 큰 제목 + 설명 + 오른쪽 동작).
// 겹쳐 올라오던 시트와 한나체 제목은 걷었다. tone 은 바탕의 옅은 빛만 바꾼다: brand(주황) · ink(무채색) · warm(옅은 주황) · tint(가장 옅게).
// 본문은 <PageSheet> 에 넣는다 — 이제는 그냥 본문 칸이다(위는 머리가 띄우고 아래는 넉넉히 비운다).
import s from './hero.module.css';

const TONE = { brand: s.brand, ink: s.ink, warm: s.warm, tint: s.tint } as const;

export function PageHero({
  tone = 'tint',
  eyebrow,
  title,
  sub,
  action,
  children,
  narrow = false,
}: {
  narrow?: boolean;
  tone?: keyof typeof TONE;
  eyebrow?: string;
  title: React.ReactNode;
  sub?: React.ReactNode;
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className={`${s.hero} ${TONE[tone]}`}>
      <div className={`container ${s.inner} ${narrow ? s.narrow : ''}`}>
        <div className={s.head}>
          <div className={s.text}>
            {eyebrow ? <p className={`t-strong ${s.eyebrow}`}>{eyebrow}</p> : null}
            <h1 className={`t-display ${s.title}`}>{title}</h1>
            {sub ? <p className={`t-body ${s.sub}`}>{sub}</p> : null}
          </div>
          {action ? <div className={s.action}>{action}</div> : null}
        </div>
        {children}
      </div>
    </section>
  );
}

export function PageSheet({ children, narrow = false }: { children: React.ReactNode; narrow?: boolean }) {
  return (
    <div className={s.sheet}>
      <div className={`container ${s.sheetInner} ${narrow ? s.narrow : ''}`}>{children}</div>
    </div>
  );
}
