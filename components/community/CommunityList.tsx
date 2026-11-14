'use client';
// 커뮤니티 목록 — 검색(제목 · 본문 · 태그 · 붙인 제품) · 주제 · 인기 태그 · 최신/공감 순. 시험판: 이 브라우저에만 저장(lib/community).
// 2026-11-14 디자인 v4 — 두 단(PC 1024~: 글 목록 | 인기 태그 · 글쓰기 안내). 글은 떨어진 카드 한 장씩(제목 · 두 줄 미리보기 · 태그 · 공감 · 댓글 · 시간).
// 자리 밀림 금지 — 저장소를 읽기 전에는 카드 모양 자리를 먼저 깔고, 지우기 단추는 visibility 로 켜고 끈다. 시험판 안내는 늘 보인다.
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { CATEGORIES, catLabel, listPosts, onCommunity, popularTags, type Category, type Post, type Sort } from '@/lib/community';
import { ago } from '@/lib/format';
import { Icon } from '../ui/Icon';
import s from './community.module.css';

const NOTICE = '시험판입니다. 「예시」가 붙은 글은 화면 확인용이고, 쓰신 글은 이 브라우저에만 저장됩니다.';

/** 저장소를 읽기 전 · Suspense 대기 중 — 글 카드 셋 자리. */
export function CommunityListSkeleton() {
  return (
    <div className={s.skelList} aria-hidden>
      {[0, 1, 2].map((i) => <div key={i} className={`skel ${s.skelCard}`} />)}
    </div>
  );
}

export function CommunityList() {
  const router = useRouter();
  const sp = useSearchParams();
  const cat = (sp.get('c') as Category) || null;
  const tag = sp.get('t');
  const sort: Sort = sp.get('s') === 'top' ? 'top' : 'new';
  const [q, setQ] = useState(sp.get('q') ?? '');
  const [tick, setTick] = useState(0);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
    return onCommunity(() => setTick((t) => t + 1));
  }, []);

  const posts = useMemo<Post[]>(() => (ready ? listPosts({ q, cat, sort, tag }) : []), [q, cat, sort, tag, tick, ready]);
  const tags = useMemo(() => (ready ? popularTags(10) : []), [ready, tick]);

  const nav = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) v ? next.set(k, v) : next.delete(k);
    router.replace(`/community${next.toString() ? `?${next}` : ''}`, { scroll: false });
  };

  const tagChips = tags.map((t) => (
    <button key={t} type="button" className={`chip ${tag === t ? 'on' : ''}`} aria-pressed={tag === t} onClick={() => nav({ t: tag === t ? null : t })}>
      #{t}
    </button>
  ));

  return (
    <div className="layout">
      <div className={s.main}>
        <div className={s.controls}>
          <label className={s.search}>
            <Icon name="search" size={20} className={s.searchIcon} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onBlur={() => nav({ q: q.trim() || null })}
              onKeyDown={(e) => { if (e.key === 'Enter') nav({ q: q.trim() || null }); }}
              placeholder="꿀팁 찾기 (예: 말티톨, 1회분, 단백질)"
              aria-label="커뮤니티 글 찾기"
            />
            <button
              type="button"
              onClick={() => { setQ(''); nav({ q: null }); }}
              aria-label="지우기"
              aria-hidden={!q}
              tabIndex={q ? 0 : -1}
              className={s.clear}
              style={{ visibility: q ? 'visible' : 'hidden' }}
            >
              <Icon name="close" size={16} />
            </button>
          </label>

          <div className={s.bar}>
            <div className={s.tabs} role="tablist" aria-label="주제">
              <button type="button" role="tab" aria-selected={!cat} className={s.tab} onClick={() => nav({ c: null })}>전체</button>
              {CATEGORIES.map((c) => (
                <button key={c.id} type="button" role="tab" aria-selected={cat === c.id} className={s.tab} onClick={() => nav({ c: c.id })}>
                  {c.label}
                </button>
              ))}
            </div>
            <div className={s.sort} role="group" aria-label="줄 세우기">
              <button type="button" className={s.sortCell} aria-pressed={sort === 'new'} onClick={() => nav({ s: null })}>최신</button>
              <button type="button" className={s.sortCell} aria-pressed={sort === 'top'} onClick={() => nav({ s: 'top' })}>공감</button>
            </div>
          </div>

          <div className={`m-only ${s.tagScroll}`} aria-label="인기 태그">{tagChips}</div>

          <p className={`m-only t-caption ${s.notice}`}>
            <Icon name="info" size={16} />
            <span>{NOTICE}</span>
          </p>
        </div>

        {!ready ? (
          <CommunityListSkeleton />
        ) : posts.length === 0 ? (
          <div className={s.empty}>
            <span className={s.emptyIcon}><Icon name="message" size={22} /></span>
            <p className="t-headline">맞는 글이 없습니다</p>
            <p className="t-body c-t2">다른 말로 찾거나, 처음으로 글을 남겨 보세요.</p>
            <Link href="/community/write" className="btn btn-ghost btn-sm">
              <Icon name="edit" size={16} />글쓰기
            </Link>
          </div>
        ) : (
          <ul className={s.list}>
            {posts.map((p) => (
              <li key={p.id}>
                <Link href={`/community/${p.id}`} className={`lift ${s.post}`}>
                  <span className={s.postTop}>
                    <span className={`t-micro ${s.cat}`}>{catLabel(p.cat)}</span>
                    {p.sample ? <span className={`t-micro ${s.sample}`}>예시</span> : null}
                    <span className={`t-caption c-t3 ${s.when}`}>{p.author}, {ago(p.at)}</span>
                  </span>
                  <span className={`t-headline ${s.postTitle}`}>{p.title}</span>
                  <span className={`t-body c-t2 ${s.excerpt}`}>{p.body}</span>
                  <span className={s.postFoot}>
                    <span className={s.postTags}>
                      {p.tags.slice(0, 3).map((t) => <span key={t} className={`t-caption ${s.tag}`}>#{t}</span>)}
                      {p.products.length ? <span className={`t-caption ${s.tag}`}>제품 {p.products.length}</span> : null}
                    </span>
                    <span className={s.stats}>
                      <span className={s.stat} aria-label={`공감 ${p.likes}`}>
                        <Icon name="heart" size={15} /><span className="num">{p.likes}</span>
                      </span>
                      <span className={s.stat} aria-label={`댓글 ${p.comments.length}`}>
                        <Icon name="message" size={15} /><span className="num">{p.comments.length}</span>
                      </span>
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <aside className="layout-side pc-only" aria-label="커뮤니티 안내">
        <div className={s.side}>
          <section className={`card ${s.sideCard}`} aria-labelledby="cm-tags">
            <h2 id="cm-tags" className="t-strong">인기 태그</h2>
            <div className={s.tagWrap}>
              {ready ? tagChips : [0, 1, 2, 3, 4, 5].map((i) => <span key={i} className={`skel ${s.chipSkel}`} />)}
            </div>
          </section>
          <section className={`card ${s.sideCard}`} aria-labelledby="cm-write">
            <span className={s.sideIcon}><Icon name="edit" size={20} /></span>
            <h2 id="cm-write" className="t-headline">알게 된 것을 나눠 주세요</h2>
            <p className="t-body c-t2">성분표에서 확인한 방법, 장보기 요령, 궁금한 점 모두 좋습니다.</p>
            <Link href="/community/write" className="btn btn-primary btn-block">글쓰기</Link>
          </section>
          <p className={`t-caption ${s.notice}`}>
            <Icon name="info" size={16} />
            <span>{NOTICE}</span>
          </p>
        </div>
      </aside>
    </div>
  );
}
