// 성분 상세 — 서버 문장 그대로. 「안전」(safe) 표시는 내지 않는다(「안전합니다」를 쓰지 않는다).
// 2026-11-14 새 디자인 — 제품 상세와 같은 짜임으로 한눈에 읽힌다.
//   맨 위 두 칸(PC) — 왼쪽 성분 카드(이름 · 무엇인지 한 줄 · 역할 · 판정 · 피할 성분에 넣기) | 오른쪽 「한눈에 보기」(섭취 시 · 주의 대상 · 대안 제품)
//   그 아래 — 이 성분이 든 제품(카드) → 공인 기관 평가(출처)
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getIngredient } from '@/lib/api';
import { VerdictTag } from '@/components/product/Ingredients';
import { verdictTone } from '@/lib/axes';
import { ProductList } from '@/components/ProductRow';
import { ErrorState } from '@/components/States';
import { Icon } from '@/components/Icon';
import { PageBar } from '@/components/PageBar';
import { ShareButton } from '@/components/product/ShareButton';
import { Section } from '@/components/ui/Section';
import styles from './page.module.css';
import { Rich } from '@/components/Rich';
import { AddToAvoid } from '@/components/dict/AddToAvoid';

type Props = { params: { name: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const name = decodeURIComponent(params.name);
  const r = await getIngredient(name);
  return { title: name, description: r.ok ? r.data.plain : undefined };
}

export default async function IngredientPage({ params }: Props) {
  const name = decodeURIComponent(params.name);
  const r = await getIngredient(name);
  if (!r.ok) {
    if (r.status === 404) notFound();
    return (
      <main className={`container ${styles.errorPage}`}>
        <ErrorState
          title="불러오기 실패"
          body={'서버 연결이 끊겼습니다.\n잠시 뒤 다시 시도해 주시기 바랍니다.'}
          retryHref={`/i/${encodeURIComponent(name)}`}
        />
      </main>
    );
  }
  const d = r.data;
  const info = d.info;
  const concerns = (info?.concerns ?? []).filter((c) => c.type !== 'safe');
  const tone = verdictTone(d.verdict);
  const groups = info?.sensitive_groups ?? [];
  const advice = info?.advice ?? '';
  const hasFacts = concerns.length > 0 || groups.length > 0 || !!advice || !!d.instead;

  return (
    <main className={styles.page}>
      <div className="container">
        <PageBar fallback="/i">
          <ShareButton title={d.name} />
        </PageBar>
      </div>

      <div className={`container ${styles.wrap}`}>
        {/* ── 맨 위 — 성분 | 한눈에 보기 ── */}
        <div className={`${styles.top} ${hasFacts ? '' : styles.topSolo}`}>
          <section className={styles.idCard} aria-label="성분">
            <div className={styles.kind}>
              <span className={styles.kindIcon} style={tone ? { color: `var(--band-${tone})` } : undefined}>
                <Icon name="flask" size={24} />
              </span>
              <span className={styles.tags}>
                {d.tag ? <span className={`t-micro ${styles.roleTag}`}>{d.tag}</span> : null}
                <VerdictTag v={d.verdict} className="t-micro" />
              </span>
            </div>
            <div className={styles.idText}>
              <h1 className={`t-display ${styles.name}`}>{d.name}</h1>
              {info?.function ? <p className={`t-headline c-t2 ${styles.fn}`}><Rich text={info.function} /></p> : null}
            </div>
            <p className={`t-body ${styles.summary}`}><Rich text={info?.summary || d.plain} /></p>
            {d.aliases.length > 0 ? (
              <dl className={styles.aliases}>
                <dt className="t-caption c-t3">다른 표기</dt>
                <dd className="t-caption c-t2">{d.aliases.join(', ')}</dd>
              </dl>
            ) : null}
            {/* 2026-11-13 — 성분 사전에서 바로 내 피할 성분에 넣기 · 빼기 */}
            <div className={styles.actions}>
              <AddToAvoid k={d.key} label={d.name} className={styles.avoid} />
            </div>
          </section>

          {hasFacts ? (
            <section className={styles.facts} aria-labelledby="facts-h">
              <h2 id="facts-h" className={styles.factsKicker}>
                <Icon name="info" size={18} />
                한눈에 보기
              </h2>
              <dl className={styles.factList}>
                {concerns.length > 0 ? (
                  <div className={styles.fact}>
                    <dt className="t-caption c-t3">섭취 시</dt>
                    <dd>
                      <ul className={styles.effects}>
                        {concerns.map((c, i) => (
                          <li key={`${c.label}-${i}`} className={styles.effect}>
                            <span className="t-strong">{c.label}</span>
                            {c.note ? <span className="t-body c-t2"><Rich text={c.note} /></span> : null}
                          </li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                ) : null}
                {groups.length > 0 || advice ? (
                  <div className={styles.fact}>
                    <dt className="t-caption c-t3">주의 대상</dt>
                    <dd className={styles.factValue}>
                      {groups.length > 0 ? <span className="t-strong">{groups.join(', ')}</span> : null}
                      {advice ? <span className="t-body c-t2"><Rich text={advice} /></span> : null}
                    </dd>
                  </div>
                ) : null}
                {d.instead ? (
                  <div className={styles.fact}>
                    <dt className="t-caption c-t3">대안 제품</dt>
                    <dd className={styles.factValue}>
                      <span className="t-body c-t2"><Rich text={d.instead} /></span>
                    </dd>
                  </div>
                ) : null}
              </dl>
            </section>
          ) : null}
        </div>

        {/* ── 본문 ── */}
        <div className={styles.body}>
          {d.found_in.length > 0 ? (
            <Section id="found-h" title="이 성분이 든 제품" sub={`${d.found_in.length}개`}>
              <ProductList items={d.found_in} grid />
            </Section>
          ) : null}

          {info && info.authorities.length > 0 ? (
            <Section id="auth-h" title="공인 기관 평가" sub="근거와 출처">
              <dl className={`card ${styles.auth}`}>
                {info.authorities.map((a, i) => (
                  <div key={`${a.body}-${i}`} className={styles.authRow}>
                    <dt className={`t-strong ${styles.authBody}`}>
                      <Icon name="book" size={18} className="c-t3" />
                      <span>{a.body}</span>
                    </dt>
                    <dd className="t-body c-t2"><Rich text={a.assessment} /></dd>
                  </div>
                ))}
              </dl>
            </Section>
          ) : null}
        </div>
      </div>
    </main>
  );
}
