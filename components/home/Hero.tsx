// 첫 화면 — 한 줄 + 검색(핵심 행동) + 앱 받기 + 실제 제품 판독 휴대폰.
// 휴대폰 둘레의 식품 타일·떠 있는 카드는 Hozon(음식이 화면 밖으로 흩어진 구성)·Bevel(위젯 카드)에서 가져왔다.
import { Rich } from '@/components/Rich';
import Link from 'next/link';
import { SearchBox } from '../SearchBox';
import { LensLine } from '../start/LensLine';
import { AppStoreButton } from '../AppStoreButton';
import { FoodTile } from '../FoodTile';
import { Icon } from '../Icon';
import { PhoneMock } from './PhoneMock';
import { SAMPLE_QUERIES } from '@/lib/site';
import type { Alternative, ProductDetail } from '@/lib/types';
import styles from './home.module.css';
import { CARB_FOODS } from '@/lib/content/carb';

export function Hero({ p, alt }: { p: ProductDetail; alt?: Alternative | null }) {
  const sugarLine = p.daily_value?.items.find((x) => x.nutrient === 'sugars')?.sentence;
  return (
    <section className={styles.hero}>
      <div className={`container ${styles.heroInner}`}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>가공식품 라벨, 내 기준으로</p>
          <h1 className={`t-hero ${styles.heroLine}`}>
            라벨 뒷면,
            <br />
            <span className={styles.heroAccent}>한눈에</span>
          </h1>
          <p className={`t-headline c-t2 ${styles.heroSub}`}>
            내가 피하는 성분이 들었는지, 얼마나 들었는지부터 보여 드립니다.
          </p>
          <div className={styles.heroSearch}>
            <SearchBox hero />
            <ul className={styles.samples} aria-label="예시 검색어">
              {SAMPLE_QUERIES.map((s) => (
                <li key={s}>
                  <Link href={`/search?q=${encodeURIComponent(s)}`} className={styles.sample}>
                    {s}
                  </Link>
                </li>
              ))}
            </ul>
            <LensLine className={styles.heroLens} />
          </div>
          <div className={styles.heroApp}>
            <AppStoreButton />
            <p className="t-caption c-t2">
              앱은 바코드 스캔
              <br />웹은 설치 없이 검색
            </p>
          </div>
        </div>

        <div className={styles.heroArt}>
          <span className={`${styles.float} ${styles.f1}`}><FoodTile kind="snack" size={88} /></span>
          <span className={`${styles.float} ${styles.f2}`}><FoodTile kind="drink" size={56} /></span>
          <span className={`${styles.float} ${styles.f3}`}><FoodTile kind="noodle" size={88} /></span>
          <span className={`${styles.float} ${styles.f4}`}><FoodTile kind="dairy" size={56} /></span>
          <span className={`${styles.float} ${styles.f5}`}><FoodTile kind="bakery" size={56} /></span>
          <Link href={`/p/${p.id}`} className={styles.phoneLink} aria-label={`${p.name} 판독 결과`}>
            <PhoneMock p={p} alt={alt} />
          </Link>
          {sugarLine ? (
            <div className={`${styles.widget} ${styles.w1}`} aria-hidden="true">
              <span className="t-micro c-t2">당류</span>
              <span className="t-strong"><Rich text={sugarLine} /></span>
            </div>
          ) : null}
          <div className={`${styles.widget} ${styles.w2}`} aria-hidden="true">
            <Icon name="bowl" size={20} className="c-t2" />
            <span className="t-caption c-t2">{`${CARB_FOODS.rice.name} 1${CARB_FOODS.rice.unit} = 당질 ${CARB_FOODS.rice.g}g`}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
