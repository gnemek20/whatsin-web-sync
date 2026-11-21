// 사이트맵 묶음(2026-11-18) — static.xml(홈 · 성분 사전 · 안내 · 커뮤니티) · products-<n>.xml(제품 상세 4만 개씩).
import { API_BASE } from '@/lib/config';
import { SITE_URL, SITEMAP_PRODUCTS_PER_FILE, xmlEscape } from '@/lib/seo';
import dictionary from '@/data/ingredients/dictionary.json';
import { HUBS, hubHref } from '@/lib/hubs';

export const revalidate = 3600;

const urlset = (locs: string[]) => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${locs.map((l) => `  <url><loc>${xmlEscape(l)}</loc></url>`).join('\n')}
</urlset>`;
const xml = (body: string) => new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });

export async function GET(_req: Request, { params }: { params: { name: string } }) {
  const name = params.name;
  if (name === 'static.xml') {
    const items = Object.keys((dictionary as { items: Record<string, unknown> }).items ?? {});
    return xml(urlset([
      `${SITE_URL}/`,
      `${SITE_URL}/i`,
      `${SITE_URL}/guide`,
      `${SITE_URL}/community`,
      `${SITE_URL}/c`,
      ...HUBS.map((x) => `${SITE_URL}${hubHref(x)}`),
      ...items.map((k) => `${SITE_URL}/i/${encodeURIComponent(k)}`),
    ]));
  }
  const m = /^products-(\d{1,3})\.xml$/.exec(name);
  if (!m) return new Response('Not Found', { status: 404 });
  try {
    const r = await fetch(`${API_BASE}/products/sitemap-ids?part=${m[1]}&size=${SITEMAP_PRODUCTS_PER_FILE}`, { next: { revalidate: 3600 } });
    if (!r.ok) return new Response('Upstream error', { status: 503 });
    const ids: string[] = (await r.json()).ids ?? [];
    if (!ids.length) return new Response('Not Found', { status: 404 });
    return xml(urlset(ids.map((id) => `${SITE_URL}/p/${id}`)));
  } catch {
    return new Response('Upstream error', { status: 503 });
  }
}
