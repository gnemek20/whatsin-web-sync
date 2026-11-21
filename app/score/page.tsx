'use client';

import { useEffect, useRef, useState } from 'react';
import { gradeOf, type GradeLetter, searchProducts, getScoreExplain, ApiError, SearchIcon } from '@/components/score/compat';
import type { ProductSummary, ScoreExplain } from '@/lib/scoreTypes';
import ScoreExplainView from '@/components/score/ScoreExplainView';
import { LogoMark } from '@/components/site/Logo';
import styles from './page.module.css';

// 점수 계산 조회 페이지 — 제품 검색 → 선택 → 점수 산정 흐름 시각화. 2026-11-20 되살림(앱 「판정 기준 ›」이 여는 주소 · components/score/compat).
// 메인 내비 비노출. 실데이터(backend /products/{id}/score-explain)를 그대로 그린다.

// 점수 문자 등급 추정(리스트 카드용) — 상세 점수는 서버 grade 를 쓴다.
function letterFromScore(s: number): GradeLetter {
  return s >= 80 ? 'A' : s >= 60 ? 'B' : s >= 40 ? 'C' : s >= 20 ? 'D' : 'E';
}

// 점수 흐름이 한눈에 들어오는 대표 제품 — 검색 없이 버튼 한 번으로 연다.
// 각 검색어의 첫 번째 결과를 그대로 사용한다(검색 결과 순서 = 서버 정렬).
const QUICK_PICKS = ['카누', '백소정 빵가루'];

export default function ScorePage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<ProductSummary | null>(null);
  const [explain, setExplain] = useState<ScoreExplain | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 디바운스 검색
  useEffect(() => {
    const q = query.trim();
    if (debounce.current) clearTimeout(debounce.current);
    if (q === '') {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounce.current = setTimeout(async () => {
      try {
        setResults(await searchProducts(q));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query]);

  async function pick(p: ProductSummary) {
    setSelected(p);
    setResults([]);
    setQuery('');
    setExplain(null);
    setError(null);
    setLoading(true);
    try {
      setExplain(await getScoreExplain(p.id));
    } catch (e) {
      setError(
        e instanceof ApiError ? `조회 실패 (${e.status}) — ${e.detail}` : '조회 중 오류가 났어요.',
      );
    } finally {
      setLoading(false);
    }
  }

  // 대표 제품 바로 보기 — 검색어를 치지 않고 첫 검색 결과를 그대로 연다.
  async function quickPick(term: string) {
    if (loading) return;
    setError(null);
    setResults([]);
    setQuery('');
    setExplain(null);
    setSelected(null);
    setLoading(true);
    try {
      const list = await searchProducts(term);
      if (list.length === 0) {
        setError(`'${term}' 로 검색된 제품이 없어요.`);
        return;
      }
      setSelected(list[0]);
      setExplain(await getScoreExplain(list[0].id));
    } catch (e) {
      setError(
        e instanceof ApiError ? `조회 실패 (${e.status}) — ${e.detail}` : '조회 중 오류가 났어요.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        {/* 헤더 */}
        <header className={styles.head}>
          <div className={styles.brandRow}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <LogoMark size={26} />
            <span className={styles.wordmark}>What&apos;s In?</span>
            <span className={styles.tag}>점수 계산 조회</span>
          </div>
          <h1 className={styles.title}>제품 점수, 이렇게 계산돼요</h1>
          <p className={styles.sub}>
            제품을 검색하면 영양 기본점수(Nutri-Score)부터 성분 감점·상한까지 —
            최종 등급이 어떻게 나오는지 전 과정을 보여드려요.
          </p>
        </header>

        {/* 검색 */}
        <div className={styles.searchBar}>
          <SearchIcon stroke="var(--t3)" />
          <input
            className={styles.input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="제품명을 검색하세요 (예: 초코, 커피믹스, 소시지)"
            aria-label="제품 검색"
          />
        </div>

        {/* 바로 보기 — 점수 흐름이 가장 알아보기 쉬운 대표 제품 */}
        <div className={styles.quickRow}>
          <span className={styles.quickLabel}>바로 보기</span>
          {QUICK_PICKS.map((term) => (
            <button
              key={term}
              type="button"
              className={styles.quickBtn}
              onClick={() => quickPick(term)}
              disabled={loading}
            >
              {term}
            </button>
          ))}
        </div>

        {(searching || results.length > 0) && (
          <div className={styles.results}>
            {searching && results.length === 0 && (
              <div className={styles.hint}>검색 중…</div>
            )}
            {results.map((p) => {
              const g = gradeOf(letterFromScore(p.score));
              return (
                <button key={p.id} type="button" className={styles.result} onClick={() => pick(p)}>
                  <div className={styles.resultInfo}>
                    <div className={styles.resultName}>{p.name}</div>
                    <div className={styles.resultBrand}>
                      {p.brand}
                      {p.sub ? ` · ${p.sub}` : ''}
                    </div>
                  </div>
                  {p.status === 'preparing' ? (
                    <span className={styles.preparing}>준비중</span>
                  ) : (
                    <span className={styles.resultGrade}>
                      <span className={styles.dot} style={{ background: g.dot }} />
                      <span style={{ color: g.text }}>{p.score}</span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* 결과 */}
        <div className={styles.output}>
          {loading && <div className={styles.center}>불러오는 중…</div>}
          {error && !loading && <div className={styles.errorBox}>{error}</div>}
          {!loading && !error && explain && <ScoreExplainView data={explain} />}
          {!loading && !error && !explain && !selected && (
            <div className={styles.placeholder}>
              위에서 제품을 검색해 선택하면 점수 계산 흐름이 여기에 나타나요.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
