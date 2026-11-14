// 첫 화면 — 소개와 실제 기능이 한 흐름이다: 한 줄 → 검색 → 세 축 → 둘러보기 → 읽는 법 → 앱 받기.
import { getAlternatives, getCollections, getIngredientOfDay, getProduct } from '@/lib/api';
import { SHOWCASE_ID, SHOWCASE_SNAPSHOT } from '@/lib/showcase';
import { Hero } from '@/components/home/Hero';
import { AxesSection, DownloadSection, ExploreSection, HowSection } from '@/components/home/Sections';

export const revalidate = 3600;

export default async function Home() {
  const [prod, alts, colls, today] = await Promise.all([
    getProduct(SHOWCASE_ID),
    getAlternatives(SHOWCASE_ID),
    getCollections(),
    getIngredientOfDay(),
  ]);
  const p = prod.ok ? prod.data : SHOWCASE_SNAPSHOT;
  const alt = alts.ok ? alts.data.find((a) => a.kind === 'better') ?? alts.data[0] ?? null : null;

  return (
    <main>
      <Hero p={p} alt={alt} />
      <AxesSection p={p} />
      <ExploreSection collections={colls.ok ? colls.data : []} today={today.ok ? today.data : null} />
      <HowSection />
      <DownloadSection />
    </main>
  );
}
