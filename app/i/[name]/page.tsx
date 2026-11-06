// 성분 상세 — 서버 문장 그대로. 「안전」(safe) 표시는 내지 않는다(「안전합니다」를 쓰지 않는다).
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getIngredient } from '@/lib/api';
import { VerdictTag } from '@/components/product/Ingredients';
import { verdictTone } from '@/lib/axes';
import { ProductList } from '@/components/ProductRow';
import { ErrorState } from '@/components/States';
import { Icon } from '@/components/Icon';
import styles from './page.module.css';
import { Rich } from '@/components/Rich';

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

  return (
    <main className={styles.page}>
      {/* 첫 면 — 잉크(앱 IngredientScreen 히어로 · DESIGN_RULES §5 「성분 상세 히어로는 잉크 면」) */}
      <header className={`band-ink ${styles.hero}`}>
        <div className={`container ${styles.col}`}>
          <div className={styles.head}>
            <p className={`t-micro c-t2 ${styles.kind}`}>
              <Icon name="flask" size={16} style={verdictTone(d.verdict) ? { color: `var(--band-${verdictTone(d.verdict)})` } : undefined} />
              <span>{d.tag}</span>
              <VerdictTag v={d.verdict} />
            </p>
            <h1 className="t-title">{d.name}</h1>
            {info?.function ? <p className="t-caption c-t3"><Rich text={info.function} /></p> : null}
            <p className={`t-body ${styles.summary}`}><Rich text={info?.summary || d.plain} /></p>
            {d.aliases.length > 0 ? <p className="t-caption c-t3">다른 표기: {d.aliases.join(', ')}</p> : null}
          </div>
        </div>
      </header>

      <div className={`sheet sheet-paper sheet-last ${styles.sheet}`}>
      <div className={`container ${styles.col}`}>
      <div className={styles.blocks}>
        {concerns.length > 0 ? (
          <section className={`card ${styles.block}`}>
            <h2 className="t-headline">섭취 시 영향</h2>
            <ul className={styles.rows}>
              {concerns.map((c, i) => (
                <li key={`${c.label}-${i}`}>
                  <p className="t-strong">{c.label}</p>
                  {c.note ? <p className="t-body c-t2"><Rich text={c.note} /></p> : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {info && info.sensitive_groups.length > 0 ? (
          <section className={`card ${styles.block}`}>
            <h2 className="t-headline">주의 대상</h2>
            <p className="t-body">{info.sensitive_groups.join(', ')}</p>
          </section>
        ) : null}

        {info && info.authorities.length > 0 ? (
          <section className={`card ${styles.block}`}>
            <h2 className="t-headline">공인 기관 평가</h2>
            <dl className={styles.auth}>
              {info.authorities.map((a, i) => (
                <div key={`${a.body}-${i}`} className={styles.authRow}>
                  <dt className="t-strong">{a.body}</dt>
                  <dd className="t-body c-t2"><Rich text={a.assessment} /></dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        {info?.advice ? <p className={`t-body ${styles.advice}`}><Rich text={info.advice} /></p> : null}

        {d.found_in.length > 0 ? (
          <section className={styles.found}>
            <h2 className="t-headline">함유 제품</h2>
            <ProductList items={d.found_in} />
          </section>
        ) : null}
      </div>
      </div>
      </div>
    </main>
  );
}
