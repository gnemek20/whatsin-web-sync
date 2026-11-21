// 첫 화면(2026-11-16 개편) — 소개가 아니라 **바로 쓰는 화면**(사용자 「훨씬 심플하고 바로 사용 가능한 랜딩 · 가이드는 별도」).
//   한 줄 질문 → 검색 → 내 기준 한 줄 → 바로 열어 보기(실제 제품 사진) → 조건으로 찾기 → 처음이면 보는 법(/guide) · 앱.
//   예시 검색어 알약은 걷어 검색창을 열면 나오는 「추천 검색어」로 옮겼다(사용자 「태그 나열 안 좋아해」 · SearchBox).
// 검색 결과도 이 주소(/?q=)에서 그린다 — 위는 SearchTop(검색창 한 줄), 아래는 결과(search/ResultsView).
// 모바일은 검색창이 화면 아래 탭 막대 위에 늘 떠 있고, 누르면 전체 화면 시트로 펼친다(SearchBox dock).
// 데스크톱은 같은 검색창이 첫 화면 가운데에 있고, 스크롤해 벗어나면 머리 검색(HeaderSearch)이 내려온다.
import Link from 'next/link';
import { SearchBox } from '../SearchBox';
import { LensLine } from '../start/LensLine';
import { AppStoreButton } from '../AppStoreButton';
import { FoodTile } from '../FoodTile';
import { Icon } from '../Icon';
import { carbAmount } from '@/lib/content/carb';
import type { ProductSummary } from '@/lib/types';
import { AskLink, Picks } from './Picks';
import { hubBySlug, hubHref, hubSub } from '@/lib/hubs';
import s from './landing.module.css';

// 조건으로 찾기 — 분류 허브(/c/… · 2026-11-18 「조건으로 찾기를 페이지화」)로 간다. 같은 검색 화면에 고정 주소 · 전체는 /c.
const ASKS = ['당류 낮은 아이스크림', '단백질 많은 과자', '나트륨 적은 라면', '열량 낮은 음료'].map((t) => hubBySlug(t.replace(/\s+/g, '-'))!).filter(Boolean);

/** 제품 카드 한 줄 사실 — 1회분 당질(서버 축 값 그대로). 모르면 식품 종류. */
function factOf(p: ProductSummary): string {
  const g = p.axes?.glycemic;
  if (g?.band === 'amount' && g.carb_g != null) return `1회분 순탄수화물 ${carbAmount(g.carb_g)}`;
  if (g?.band === 'n/a') return '순탄수화물 없음';
  return p.sub;
}

/** 검색 결과 화면의 위 — 검색창 한 줄(모바일은 아래 고정 · 누르면 시트). 결과는 그 아래(ResultsView). */
export function SearchTop({ q }: { q: string }) {
  return (
    <section className={`search-host ${s.top}`} aria-label="검색">
      <div className={`container ${s.topInner}`}>
        <div className={s.dock}>
          <SearchBox key={q} hero dock size="md" defaultValue={q} />
        </div>
      </div>
    </section>
  );
}

export function Landing({ picks }: { picks: ProductSummary[] }) {
  const floats = picks.filter((p) => p.image_url).slice(0, 4);
  return (
    <main className={s.main}>
      <section className={`search-host ${s.hero}`} aria-labelledby="land-h">
        <div className={s.aura} aria-hidden>
          <span className={s.b1} />
          <span className={s.b2} />
          <span className={s.b3} />
        </div>
        {/* 넓은 화면 — 실제 제품 사진이 가장자리에 떠 있다(장식 · 아래 「바로 열어 보기」에 같은 제품이 링크로 있다) */}
        <div className={s.floats} aria-hidden>
          {floats.map((p, i) => (
            <span key={p.id} className={`${s.float} ${s[`f${i + 1}`]}`}>
              <FoodTile src={p.image_url} type={p.sub} size={104} />
            </span>
          ))}
        </div>

        <div className={`container ${s.heroInner}`}>
          <h1 id="land-h" className={s.title}>
            어떤 제품이 <span className={s.accent}>궁금하세요?</span>
          </h1>

          <div className={s.dock}>
            <SearchBox hero dock placeholder="제품 이름, 원하는 조건" />
          </div>

          <LensLine className={s.lens} />
        </div>
      </section>

      <section className={`container ${s.block}`} aria-labelledby="pick-h">
        <div className={s.head}>
          <h2 id="pick-h" className={s.h2}>바로 열어 보기</h2>
        </div>
        {/* 최근 검색으로 많이 연 제품 순 · 모자라면 유명 제로 제품(lib/picks) · 모바일은 저절로 넘어가는 끝없는 줄 */}
        <Picks items={picks.map((p) => ({ id: p.id, name: p.name, image_url: p.image_url, sub: p.sub, fact: factOf(p) }))} />
      </section>

      <section className={`container ${s.block}`} aria-labelledby="ask-h">
        <div className={s.head}>
          <h2 id="ask-h" className={s.h2}>조건으로 찾기</h2>
          <Link href="/c" className={s.headMore}>
            전체 보기
            <Icon name="next" size={16} />
          </Link>
        </div>
        <ul className={s.asks}>
          {ASKS.map((a) => (
            <li key={a.slug}>
              <AskLink href={hubHref(a)} type={a.tile} sub={hubSub(a)}>
                {a.q}
              </AskLink>
            </li>
          ))}
        </ul>
      </section>

      <section className={`container ${s.block} ${s.last}`} aria-label="더 알아보기">
        <div className={s.duo}>
          <Link href="/guide" className={s.guide}>
            <span className={s.guideIcon} aria-hidden>
              <Icon name="book" size={22} />
            </span>
            <span className={s.guideText}>
              <span className={s.guideTitle}>보는 법</span>
              <span className={s.guideSub}>점수와 숫자를 읽는 법</span>
            </span>
            <span className={s.guideGo} aria-hidden>
              <Icon name="next" size={18} />
            </span>
          </Link>
          <div className={s.app}>
            <span className={s.appIcon} aria-hidden>
              <Icon name="scan" size={22} />
            </span>
            <span className={s.guideText}>
              <span className={s.guideTitle}>바코드는 앱으로</span>
              <span className={s.guideSub}>매장에서 찍으면 바로 확인</span>
            </span>
            <AppStoreButton />
          </div>
        </div>
      </section>
    </main>
  );
}
