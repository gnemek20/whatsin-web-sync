// 커뮤니티(꿀팁 나눔) — 2026-11-13 웹 개편 시험판. 조사에서 사람들이 서로 묻고 알려 주는 자리가 따로 있었다(pmf-research 02_수요조사).
// ⚠ 지금은 서버가 없다 — 이 브라우저(localStorage)에만 저장한다. 처음 보이는 글은 화면 확인용 **예시**이고 실제 사용자 글이 아니다(sample: true).
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
  sample?: boolean;
};

const KEY = 'wi_community_v1';
const NAME = 'wi_community_name';
const EVENT = 'wi-community';
const DAY = 86400000;

// 예시 글 — 내용은 조사 · 공표 기준에서 확인한 사실만 쓴다(출처를 글 끝에 적는다). 특정 제품을 좋다 · 나쁘다 말하지 않는다.
function seed(now: number): Post[] {
  return [
    {
      id: 's1', cat: 'zero', sample: true, author: '예시 글', at: now - 2 * 3600000, likes: 24, comments: [
        { id: 'c1', author: '예시 댓글', body: '「톨」로 끝나는 이름만 봐도 반은 걸러지네요.', at: now - 3600000 },
      ],
      title: '「제로」 제품은 원재료에서 「톨」로 끝나는 이름부터 봅니다',
      body: '당류 0g이어도 말티톨, 소르비톨, 에리스리톨 같은 당알코올은 당류 표시에 들어가지 않습니다.\n당알코올을 10% 이상 넣으면 포장에 「과량 섭취 시 설사를 일으킬 수 있습니다」를 적어야 하니, 그 문구가 있는지도 같이 보면 됩니다.\n\n출처: 식약처 「식품등의 표시기준」',
      tags: ['당알코올', '제로', '말티톨'], products: [],
    },
    {
      id: 's2', cat: 'glucose', sample: true, author: '예시 글', at: now - 1 * DAY, likes: 41, comments: [],
      title: '당질 = 탄수화물 − 식이섬유, 섬유를 안 적은 제품은 그냥 탄수화물로 봅니다',
      body: '식이섬유는 표시 의무가 아니라서 적지 않은 제품이 많습니다. 그런 제품은 탄수화물을 그대로 당질로 보는 게 안전한 쪽입니다(실제보다 많거나 같게 잡힘).\n와츠인에서 당질을 내 기준으로 고르면, 식이섬유가 없는 제품에 「식이섬유 표시 없음」이 같이 뜹니다.',
      tags: ['당질', '식이섬유', '계산'], products: [],
    },
    {
      id: 's3', cat: 'diet', sample: true, author: '예시 글', at: now - 2 * DAY, likes: 18, comments: [
        { id: 'c2', author: '예시 댓글', body: '100g당만 보고 샀다가 한 봉지가 250g이라 놀란 적 있어요.', at: now - 1.5 * DAY },
      ],
      title: '영양표는 「1회분」인지 「100g당」인지 「총 내용량」인지부터 봅니다',
      body: '같은 열량 숫자라도 기준이 다르면 몇 배씩 차이가 납니다. 한 번에 다 먹는 제품이면 총 내용량 기준 숫자를 보는 게 맞습니다.\n비교할 때는 100g당으로 맞춰 보면 공정합니다. 비교 탭에서 기준을 바꿔 볼 수 있습니다.',
      tags: ['열량', '1회분', '비교'], products: [],
    },
    {
      id: 's4', cat: 'shopping', sample: true, author: '예시 글', at: now - 3 * DAY, likes: 12, comments: [],
      title: '마트 가기 전에 후보 두세 개를 비교 탭에 담아 둡니다',
      body: '진열대 앞에서 성분표를 하나하나 읽기 어려워서, 집에서 후보를 담아 숫자를 나란히 보고 갑니다. 내 기준 숫자가 맨 위에 와서 고르기 편합니다.',
      tags: ['비교', '장보기'], products: [],
    },
    {
      id: 's5', cat: 'question', sample: true, author: '예시 글', at: now - 4 * DAY, likes: 9, comments: [
        { id: 'c3', author: '예시 댓글', body: '표시기준 열량 계수로는 알룰로스가 0kcal/g이라 열량에는 거의 안 잡힌다고 알고 있어요. 탄수화물 칸에는 들어갑니다.', at: now - 3.5 * DAY },
      ],
      title: '알룰로스는 탄수화물에 들어가나요?',
      body: '저당 아이스크림 영양표를 보면 탄수화물은 꽤 있는데 당류는 적어서 헷갈립니다. 알룰로스는 어디에 들어가는 건가요?',
      tags: ['알룰로스', '대체당'], products: [],
    },
    {
      id: 's6', cat: 'diet', sample: true, author: '예시 글', at: now - 6 * DAY, likes: 15, comments: [],
      title: '단백질은 「한 번 먹는 양」으로 봅니다',
      body: '100g당 단백질이 높아도 한 번에 먹는 양이 20g이면 실제로는 얼마 안 됩니다. 내 기준에서 「1회분」으로 놓고 보면 바로 보입니다.',
      tags: ['단백질', '1회분'], products: [],
    },
  ];
}

function read(): Post[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const s = seed(Date.now());
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
