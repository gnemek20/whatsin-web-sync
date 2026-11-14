'use client';
// 글쓰기 — 주제 · 제목 · 본문 · 태그(쉼표나 엔터) · 제품 붙이기(이름 검색). 의료 조언처럼 읽히는 말을 막지는 않지만 안내를 붙인다.
// 2026-11-14 디자인 v4 — 읽기 폭 카드 한 장. 닉네임 칸은 늘 보인다(저장소를 읽은 뒤 나타나면 아래가 밀린다 · 이미 정했으면 채워 둔다).
// 제품 찾기 결과는 입력칸 아래에 떠 있다(position: absolute).
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CATEGORIES, addPost, myName, setMyName, type Category } from '@/lib/community';
import { subLine } from '@/lib/format';
import { Icon } from '../ui/Icon';
import s from './community.module.css';

type Sug = { id: string; name: string; brand: string; sub: string };

export function Composer() {
  const router = useRouter();
  const [cat, setCat] = useState<Category>('shopping');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagText, setTagText] = useState('');
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [pq, setPq] = useState('');
  const [sugs, setSugs] = useState<Sug[]>([]);
  const [name, setName] = useState('');
  useEffect(() => {
    setName(myName());
  }, []);
  useEffect(() => {
    const t = pq.trim();
    if (!t) {
      setSugs([]);
      return;
    }
    const ctl = new AbortController();
    const id = window.setTimeout(async () => {
      try {
        const r = await fetch(`/api/suggest?q=${encodeURIComponent(t)}`, { signal: ctl.signal });
        if (r.ok) setSugs(await r.json());
      } catch {}
    }, 180);
    return () => {
      ctl.abort();
      window.clearTimeout(id);
    };
  }, [pq]);

  const addTag = () => {
    const t = tagText.trim().replace(/^#/, '').slice(0, 16);
    if (t && !tags.includes(t) && tags.length < 5) setTags([...tags, t]);
    setTagText('');
  };
  const shown = sugs.filter((x) => !products.some((p) => p.id === x.id)).slice(0, 6);
  const ok = title.trim().length >= 4 && body.trim().length >= 10 && !!name.trim();
  const submit = () => {
    if (!ok) return;
    if (name.trim() !== myName()) setMyName(name);
    const p = addPost({ cat, title: title.trim(), body: body.trim(), tags, products });
    router.push(`/community/${p.id}`);
  };

  return (
    <div className={`card ${s.composer}`}>
      <div className={s.field}>
        <span className={`t-strong ${s.label}`}>주제</span>
        <div className={s.tagWrap}>
          {CATEGORIES.map((c) => (
            <button key={c.id} type="button" className="chip" aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>{c.label}</button>
          ))}
        </div>
      </div>
      <div className={s.fieldRow}>
        <label className={`${s.field} ${s.fieldName}`}>
          <span className={`t-strong ${s.label}`}>닉네임</span>
          <input className={s.input} value={name} onChange={(e) => setName(e.target.value)} maxLength={16} placeholder="처음 한 번만 정합니다" />
        </label>
        <label className={`${s.field} ${s.fieldGrow}`}>
          <span className={`t-strong ${s.label}`}>제목</span>
          <input className={s.input} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="한 줄로 요점을" />
        </label>
      </div>
      <label className={s.field}>
        <span className={s.labelRow}>
          <span className={`t-strong ${s.label}`}>내용</span>
          <span className="t-caption c-t3 num">{body.length}/3000</span>
        </span>
        <textarea className={`${s.input} ${s.textarea}`} rows={9} value={body} onChange={(e) => setBody(e.target.value)} maxLength={3000} placeholder="어떻게 확인하는지, 무엇을 알게 됐는지 적어 주세요. 출처가 있으면 같이 적으면 좋습니다." />
      </label>
      <div className={s.field}>
        <span className={`t-strong ${s.label}`}>태그 <span className="t-caption c-t3">5개까지, 쉼표나 엔터로 넣습니다</span></span>
        <div className={s.tagInput}>
          {tags.map((t) => (
            <button key={t} type="button" className="chip chip-mine" onClick={() => setTags(tags.filter((x) => x !== t))} aria-label={`${t} 빼기`}>
              #{t}<Icon name="close" size={12} />
            </button>
          ))}
          <input
            value={tagText}
            onChange={(e) => setTagText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                addTag();
              }
            }}
            onBlur={addTag}
            placeholder={tags.length ? '' : '예: 당알코올, 1회분'}
            aria-label="태그"
          />
        </div>
      </div>
      <div className={s.field}>
        <span className={`t-strong ${s.label}`}>제품 붙이기 <span className="t-caption c-t3">선택, 4개까지</span></span>
        {products.length ? (
          <div className={s.tagWrap}>
            {products.map((x) => (
              <button key={x.id} type="button" className="chip chip-mine" onClick={() => setProducts(products.filter((p) => p.id !== x.id))} aria-label={`${x.name} 빼기`}>
                {x.name}<Icon name="close" size={12} />
              </button>
            ))}
          </div>
        ) : null}
        <div className={s.productPick}>
          <Icon name="search" size={18} className={s.pickIcon} />
          <input className={`${s.input} ${s.pickInput}`} value={pq} onChange={(e) => setPq(e.target.value)} placeholder="제품 이름으로 찾기" aria-label="붙일 제품 찾기" />
          {shown.length ? (
            <ul className={`scroll-y ${s.pickList}`}>
              {shown.map((x) => (
                <li key={x.id}>
                  <button type="button" onClick={() => { setProducts([...products, { id: x.id, name: x.name }].slice(0, 4)); setPq(''); }}>
                    <span className={`t-strong ${s.ellipsis}`}>{x.name}</span>
                    <span className={`t-caption c-t3 ${s.ellipsis}`}>{subLine(x.brand, x.sub)}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
      <p className={`t-caption ${s.notice}`}>
        <Icon name="info" size={16} />
        <span>경험과 확인한 사실을 나눠 주세요. 진단이나 치료에 대한 조언은 의료진과 상의해야 합니다. 시험판이라 글은 이 브라우저에만 저장됩니다.</span>
      </p>
      <div className={s.submitRow}>
        <button type="button" className="btn btn-ghost" onClick={() => router.back()}>취소</button>
        <button type="button" className="btn btn-primary" onClick={submit} disabled={!ok}>올리기</button>
      </div>
    </div>
  );
}
