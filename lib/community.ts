// 커뮤니티(꿀팁 나눔) — 2026-11-13 웹 개편 시험판. 조사에서 사람들이 서로 묻고 알려 주는 자리가 따로 있었다(pmf-research 02_수요조사).
// ⚠ 지금은 서버가 없다 — 이 브라우저(localStorage)에만 저장한다. 처음 보이는 글은 와츠인이 커뮤니티에서 모아 정리한 꿀팁이다(curated: true · 2026-11-18 예시 글을 바꿨다).
// 서버로 옮길 때 이 파일의 함수 모양(listPosts · getPost · addPost · addComment · toggleLike · toggleSave)을 그대로 API 호출로 바꾼다.

export type Category = 'glucose' | 'diet' | 'zero' | 'shopping' | 'question';

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'glucose', label: '혈당 관리' },
  { id: 'diet', label: '다이어트' },
  { id: 'zero', label: '제로, 대체당' },
  { id: 'shopping', label: '장보기 팁' },
  { id: 'question', label: '질문' },
];
export const catLabel = (c: Category) => CATEGORIES.find((x) => x.id === c)?.label ?? '';

export type Comment = { id: string; author: string; body: string; at: number };
export type Post = {
  id: string;
  cat: Category;
  title: string;
  body: string;
  tags: string[];
  products: { id: string; name: string }[];
  author: string;
  at: number;
  likes: number;
  liked?: boolean;
  saved?: boolean;
  comments: Comment[];
  curated?: boolean; // 와츠인이 커뮤니티 · 공표 기준에서 모아 정리한 글(지울 수 없다)
};

const KEY = 'wi_community_v2';
const OLD_KEY = 'wi_community_v1';
const NAME = 'wi_community_name';
const EVENT = 'wi-community';
const DAY = 86400000;

// 처음 보이는 글(2026-11-18 사용자 「예시 지우고, 커뮤니티든 어디든 실제 꿀팁으로 3~5개」) — 화면 확인용 예시 글을 지우고,
//   혈당 · 저탄고지 커뮤니티에서 사람들이 실제로 쓰는 확인 방법을 모아 와츠인이 정리해 올린 글로 바꿨다.
//   근거: docs/pmf-research/02_수요조사/B_맞춤형_커뮤니티조사_2차심층.md(디시 인슐린 · 저탄고지 · 헬스보충제 갤러리 원문) + 식약처 표시기준.
//   지어낸 사용자 · 댓글 · 공감 수는 넣지 않는다(작성자는 「와츠인」 · 공감 0 · 댓글 없음). 특정 제품을 좋다 · 나쁘다 말하지 않는다.
function seed(now: number): Post[] {
  const by = { curated: true, author: '와츠인', likes: 0, comments: [] as Comment[], products: [] };
  return [
    {
      ...by, id: 'k1', cat: 'glucose', at: now - 3 * 3600000,
      title: '순탄수는 「탄수화물 − 식이섬유」로 직접 계산합니다',
      body: '혈당 관리하는 분들이 제품을 물어볼 때 가장 먼저 하는 계산입니다. 「탄수화물 28g − 식이섬유 12g = 16g」처럼 빼고 나서 하루 목표와 견줍니다.\n\n식이섬유는 표시 의무가 아니라서 아예 적지 않은 제품이 많습니다. 그때는 탄수화물을 그대로 순탄수로 보는 쪽이 안전합니다(실제보다 많거나 같게 잡힙니다).\n\n출처: 디시 당뇨 관련 갤러리 질문글, 식약처 「식품등의 표시기준」(식이섬유는 의무 표시 항목이 아님)',
      tags: ['순탄수', '식이섬유', '계산'],
    },
    {
      ...by, id: 'k2', cat: 'zero', at: now - 1 * DAY,
      title: '「무설탕」 「제로」는 원재료에서 말티톨부터 찾습니다',
      body: '당류 0g이어도 말티톨, 소르비톨 같은 당알코올은 당류 칸에 잡히지 않습니다. 커뮤니티에는 프로틴바를 한 박스 샀다가 배탈이 나고서야 원재료에서 말티톨을 발견했다는 글이 꾸준히 올라옵니다.\n\n당알코올을 주원료로 쓴 제품에는 「과량 섭취 시 설사를 일으킬 수 있습니다」를 적어야 하니, 포장에서 이 문구를 먼저 찾으면 빠릅니다. 말티톨은 설탕보다 덜하지만 혈당도 어느 정도 올립니다. 에리스리톨은 혈당에 거의 영향이 없습니다.\n\n출처: 디시 헬스보충제, 당뇨 관련 갤러리, 식약처 「식품등의 표시기준」, EFSA',
      tags: ['말티톨', '당알코올', '제로'],
    },
    {
      ...by, id: 'k3', cat: 'diet', at: now - 2 * DAY,
      title: '영양표 위 「총 내용량」 「100g당」 「1회」 기준부터 봅니다',
      body: '「당은 2g인데 1L 기준임, 100ml 아니고 총내용량당」처럼 같은 숫자를 두고 기준을 잘못 읽어 다투는 글이 자주 보입니다.\n\n영양표 맨 위 줄에 기준이 적혀 있습니다. 한 번에 다 먹는 제품이면 총 내용량 숫자를, 두 제품을 견줄 때는 100g(100ml)당 숫자를 봅니다. 「1회」 기준은 제품마다 양이 달라서 그대로 견주면 틀리기 쉽습니다.\n\n출처: 디시 저탄고지 갤러리, 식약처 「식품등의 표시기준」',
      tags: ['총 내용량', '1회분', '100g당'],
    },
    {
      ...by, id: 'k4', cat: 'glucose', at: now - 4 * DAY,
      title: '처음 먹는 간식은 식후 1시간, 2시간에 직접 재 봅니다',
      body: '당뇨 커뮤니티에서 가장 많이 돌아오는 답은 「직접 재 보라」입니다. 같은 제품이라도 사람마다, 같이 먹은 음식에 따라 오르는 정도가 다르기 때문입니다.\n\n먹기 전에 한 번, 먹고 1시간과 2시간 뒤에 재서 제품 이름과 함께 적어 두면 다음에 고를 때 그대로 쓸 수 있습니다. 비슷한 제품의 남의 측정값은 참고만 하고, 내 몸에서 한 번 확인하는 게 정확합니다. 목표 수치는 주치의와 정한 기준을 따릅니다.\n\n출처: 디시 당뇨 관련 갤러리 측정 후기',
      tags: ['혈당 측정', '식후 2시간'],
    },
  ];
}

// 2026-11-18 — 예시 글(v1)을 지우고 정리 글로 바꿨다. v1 에 사용자가 직접 쓴 글(id 가 u…)은 옮겨 온다.
function read(): Post[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      let mine: Post[] = [];
      try {
        const old = JSON.parse(localStorage.getItem(OLD_KEY) || '[]');
        if (Array.isArray(old)) mine = old.filter((p: Post) => typeof p?.id === 'string' && p.id.startsWith('u'));
        localStorage.removeItem(OLD_KEY);
      } catch {}
      const s = [...mine, ...seed(Date.now())];
      localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return seed(Date.now());
  }
}

function write(v: Post[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

export type Sort = 'new' | 'top';

const norm = (t: string) => t.toLowerCase().replace(/\s+/g, '');

export function listPosts({ q = '', cat = null, sort = 'new', tag = null }: { q?: string; cat?: Category | null; sort?: Sort; tag?: string | null } = {}): Post[] {
  const t = norm(q);
  return read()
    .filter((p) => !cat || p.cat === cat)
    .filter((p) => !tag || p.tags.includes(tag))
    .filter((p) => !t || norm([p.title, p.body, ...p.tags, ...p.products.map((x) => x.name)].join(' ')).includes(t))
    .sort((a, b) => (sort === 'top' ? b.likes - a.likes || b.at - a.at : b.at - a.at));
}

export function popularTags(limit = 10): string[] {
  const n = new Map<string, number>();
  for (const p of read()) for (const t of p.tags) n.set(t, (n.get(t) ?? 0) + 1 + p.likes / 50);
  return [...n.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([t]) => t);
}

export const getPost = (id: string) => read().find((p) => p.id === id) ?? null;

export function addPost(p: Pick<Post, 'cat' | 'title' | 'body' | 'tags' | 'products'>): Post {
  const post: Post = { ...p, id: `u${Date.now().toString(36)}`, author: myName() || '익명', at: Date.now(), likes: 0, comments: [] };
  write([post, ...read()]);
  return post;
}

export function deletePost(id: string) {
  write(read().filter((p) => p.id !== id));
}

export function addComment(id: string, body: string) {
  write(read().map((p) => (p.id === id ? { ...p, comments: [...p.comments, { id: `c${Date.now().toString(36)}`, author: myName() || '익명', body, at: Date.now() }] } : p)));
}

export function toggleLike(id: string) {
  write(read().map((p) => (p.id === id ? { ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) } : p)));
}

export function toggleSave(id: string) {
  write(read().map((p) => (p.id === id ? { ...p, saved: !p.saved } : p)));
}

export function myName(): string {
  try {
    return localStorage.getItem(NAME) ?? '';
  } catch {
    return '';
  }
}
export function setMyName(n: string) {
  try {
    localStorage.setItem(NAME, n.trim().slice(0, 16));
  } catch {}
}

export function onCommunity(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}
