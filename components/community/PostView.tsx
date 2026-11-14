'use client';
// 커뮤니티 글 하나 — 본문 · 붙인 제품(누르면 상세) · 공감 · 저장 · 댓글.
// 2026-11-14 디자인 v4 — 읽기 폭(--read) 한 단. 글은 카드 한 장, 댓글은 그 아래 목록 카드 + 남기기 카드.
// 자리 밀림 금지 — 공감 · 저장 단추는 고정 폭(글자가 「저장」↔「저장됨」으로 바뀌어도 옆 단추가 안 밀린다) · 닉네임 칸은 늘 보인다(처음엔 비어 있다).
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { addComment, catLabel, deletePost, getPost, myName, onCommunity, setMyName, toggleLike, toggleSave, type Post } from '@/lib/community';
import { ago } from '@/lib/format';
import { Icon } from '../ui/Icon';
import s from './community.module.css';

export function PostView({ id }: { id: string }) {
  const router = useRouter();
  const [post, setPost] = useState<Post | null | undefined>(undefined);
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  useEffect(() => {
    const sync = () => setPost(getPost(id));
    sync();
    setName(myName());
    return onCommunity(sync);
  }, [id]);

  const back = (
    <Link href="/community" className={`t-caption ${s.backLink}`}>
      <Icon name="back" size={16} />커뮤니티
    </Link>
  );

  if (post === undefined) {
    return (
      <div className={s.article} aria-hidden>
        {back}
        <div className={`skel ${s.articleSkel}`} />
      </div>
    );
  }
  if (post === null) {
    return (
      <div className={s.article}>
        {back}
        <div className={s.empty}>
          <span className={s.emptyIcon}><Icon name="message" size={22} /></span>
          <p className="t-headline">글을 찾지 못했습니다</p>
          <p className="t-body c-t2">시험판이라 글은 쓴 브라우저에만 있습니다.</p>
          <Link href="/community" className="btn btn-ghost btn-sm">목록으로</Link>
        </div>
      </div>
    );
  }
  const send = () => {
    const t = text.trim();
    if (!t) return;
    if (name.trim() && name.trim() !== myName()) setMyName(name);
    addComment(post.id, t);
    setText('');
  };
  const mine = !post.sample && post.id.startsWith('u');
  return (
    <div className={s.article}>
      {back}
      <article className={`card ${s.articleCard}`}>
        <header className={s.articleHead}>
          <span className={s.postTop}>
            <span className={`t-micro ${s.cat}`}>{catLabel(post.cat)}</span>
            {post.sample ? <span className={`t-micro ${s.sample}`}>예시</span> : null}
          </span>
          <h1 className={`t-display ${s.articleTitle}`}>{post.title}</h1>
          <p className="t-caption c-t3">{post.author}, {ago(post.at)}{post.sample ? ', 화면 확인용 예시 글입니다' : ''}</p>
        </header>

        <div className={s.articleBody}>
          {post.body.split('\n').map((line, i) => (line.trim() ? <p key={i}>{line}</p> : <span key={i} className={s.gap} aria-hidden />))}
        </div>

        {post.products.length ? (
          <div className={s.attached}>
            <p className="t-micro c-t3">이 글의 제품</p>
            <ul className={s.attachedList}>
              {post.products.map((x) => (
                <li key={x.id}>
                  <Link href={`/p/${x.id}`} className={s.attachedItem}>
                    <span className={s.attachedText}>
                      <span className={`t-strong ${s.ellipsis}`}>{x.name}</span>
                      <span className="t-caption c-t3">내 기준으로 보기</span>
                    </span>
                    <Icon name="next" size={16} className={s.chev} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {post.tags.length ? (
          <div className={s.tagWrap}>
            {post.tags.map((t) => <Link key={t} href={`/community?t=${encodeURIComponent(t)}`} className="chip">#{t}</Link>)}
          </div>
        ) : null}

        <div className={s.actions}>
          <button type="button" className={`btn ${post.liked ? 'btn-primary' : 'btn-ghost'} ${s.actBtn}`} onClick={() => toggleLike(post.id)} aria-pressed={!!post.liked}>
            <Icon name="heart" size={16} />공감 <span className={`num ${s.count}`}>{post.likes}</span>
          </button>
          <button type="button" className={`btn ${post.saved ? 'btn-primary' : 'btn-ghost'} ${s.actBtn}`} onClick={() => toggleSave(post.id)} aria-pressed={!!post.saved}>
            <Icon name="bookmark" size={16} />{post.saved ? '저장됨' : '저장'}
          </button>
          {mine ? (
            <button type="button" className={`btn btn-quiet ${s.delBtn}`} onClick={() => { deletePost(post.id); router.push('/community'); }}>
              <Icon name="trash" size={16} />지우기
            </button>
          ) : null}
        </div>
      </article>

      <section className={s.comments} aria-labelledby="cm-h">
        <h2 id="cm-h" className={`t-title ${s.commentsTitle}`}>
          댓글 <span className={`num c-t3 ${s.count}`}>{post.comments.length}</span>
        </h2>
        {post.comments.length ? (
          <ul className={`card ${s.commentList}`}>
            {post.comments.map((c) => (
              <li key={c.id} className={s.comment}>
                <span className={s.commentHead}>
                  <span className="t-strong">{c.author}</span>
                  <span className="t-caption c-t3">{ago(c.at)}</span>
                </span>
                <p className="t-body">{c.body}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className={`t-body c-t3 ${s.noComment}`}>아직 댓글이 없습니다. 첫 댓글을 남겨 보세요.</p>
        )}
        <div className={`card ${s.reply}`}>
          <input className={`${s.input} ${s.nameInput}`} value={name} onChange={(e) => setName(e.target.value)} placeholder="닉네임" maxLength={16} aria-label="닉네임" />
          <textarea className={s.input} rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="경험이나 팁을 남겨 주세요" maxLength={600} aria-label="댓글" />
          <div className={s.replyFoot}>
            <span className="t-caption c-t3 num">{text.length}/600</span>
            <button type="button" className="btn btn-primary" onClick={send} disabled={!text.trim()}>남기기</button>
          </div>
        </div>
      </section>
    </div>
  );
}
