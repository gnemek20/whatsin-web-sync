// 바코드 수집(whatsin.kr/collect) 브라우저 쪽 — API 정본은 backend/app/api/routers/collect.py.
// 사진이 커서(장당 수백 kB) Vercel 중계(4.5 MB 한도 · lib/visit 의 /api/v)를 거치지 않고 API 를 바로 부른다 — CORS 는 whatsin.kr 이 열려 있다.
// 수집가는 로그인 없이 이 기기로 알아본다 — 방문 집계와 같은 기기 키 + 지문(lib/visit) · 서버가 접속 IP 를 더한다.
import { API_BASE } from './config';
import { deviceKey, fingerprint } from './visit';

// 사진 셋(2026-11-03 사용자 · 수집 안내서) — 앞면(썸네일) · 표기면(원재료명 · 영양성분 · 품목보고번호) · 바코드
export type Slot = 'front' | 'label' | 'barcode';
export const SLOTS: Slot[] = ['front', 'label', 'barcode'];

// 표기면에서 읽는 칸 — 서버 label_reader.IDENT · AMOUNT · EXTRA 와 같은 이름
export const IDENT = [
  { key: 'report_no', label: '품목보고번호', hint: '숫자 그대로, 같은 제품을 묶는 열쇠' },
  { key: 'food_type', label: '식품유형', hint: '과자, 혼합음료, 가공유 같은 것' },
  { key: 'manufacturer', label: '제조원', hint: '주소까지 있으면 그대로' },
  { key: 'distributor', label: '판매원', hint: '판매원, 유통전문판매원' },
  { key: 'importer', label: '수입원', hint: '수입품만, 아니면 -' },
] as const;
export const AMOUNTS = [
  { key: 'total_content', unit: 'total_unit', label: '총 내용량', hint: '내용량 숫자' },
  { key: 'serving_size', unit: 'serving_unit', label: '1회 제공량', hint: '없으면 -' },
] as const;

export type NutKey = 'kcal' | 'sodium_mg' | 'carb_g' | 'sugars_g' | 'fat_g' | 'trans_fat_g' | 'sat_fat_g' | 'cholesterol_mg' | 'protein_g';
export const NUTRIENTS: { key: NutKey; label: string; unit: string }[] = [
  { key: 'kcal', label: '열량', unit: 'kcal' },
  { key: 'sodium_mg', label: '나트륨', unit: 'mg' },
  { key: 'carb_g', label: '탄수화물', unit: 'g' },
  { key: 'sugars_g', label: '당류', unit: 'g' },
  { key: 'fat_g', label: '지방', unit: 'g' },
  { key: 'trans_fat_g', label: '트랜스지방', unit: 'g' },
  { key: 'sat_fat_g', label: '포화지방', unit: 'g' },
  { key: 'cholesterol_mg', label: '콜레스테롤', unit: 'mg' },
  { key: 'protein_g', label: '단백질', unit: 'g' },
];

export type Collector = { id: string; name: string };
// 상한 · 한 건 금액 · 이벤트는 admin 이 정한다(2026-11-06) — reward_won 은 지금 금액(이벤트 중이면 이벤트 금액)
export type CollectEvent = { name: string; reward_won: number; start_ts: string; end_ts: string };
export type Cap = {
  total: number; limit: number; full: boolean; reward_won: number;
  base_reward_won?: number; event?: CollectEvent | null; next_event?: CollectEvent | null;
};
export type Disagree = { field: string; primary: unknown; verify: unknown; bars?: boolean };
export type Read = {
  values: Record<string, string | number | null>;
  disagree: Disagree[];
  suspicious: boolean;
  right_photo: boolean;
  notes: string[];
  ok: boolean;
  bars?: string[];
  checksum_ok?: boolean;
  // 판독 모델(2026-11-03 저녁) — 「인식이 이상해」를 누르면 tier+1 로 다시 읽는다. next_label 이 없으면 가장 위 모델.
  model?: string | null;
  model_label?: string | null;
  tier?: number;
  tiers?: number;
  next_label?: string | null;
};
export const MAX_PER_SLOT = 5;
export type BarcodeStatus = { ok: boolean; code: string; message: string; product?: string };
export type MyItem = { id: number; ts: string; name: string; brand: string | null; barcode: string; photo_front: string; status: string; reward_won?: number | null; edit_count?: number | null; cancelled?: boolean };
// 고치기(2026-11-06) — 내 제출 하나를 칸 · 칸마다 사진 묶음 · 고른 판독째(POST /collect/mine)
export type MineDetail = {
  id: number; ts: string; status: string; barcode: string; name: string; ingredients: string | null;
  report_no: string | null; food_type: string | null; manufacturer: string | null; distributor: string | null; importer: string | null;
  nutrition: Record<string, string | number | null> | null; amounts: Record<string, string | number | null> | null;
  photos: Partial<Record<string, { id: string | null; ids?: string[]; read: Read | null }>>; read_ids: Partial<Record<Slot, string>> | null;
  read_history?: Partial<Record<Slot, string[]>> | null; // 칸마다 판독 기록(오래된 것 → 최신)
  edits?: { field: string; read?: unknown; submitted?: unknown }[] | null; // 서버가 센 「사람이 고친 칸」(submitted 「-」 = 판독 값을 지우고 「-」로)
  reward_won?: number | null; edit_count?: number | null;
};
export type Me = { id: string; name: string; count: number; earned_won: number; items: MyItem[] };
export type Board = { cap: Cap; leaderboard: { name: string; count: number; rank: number; me: boolean }[]; me: Me | null };

export class CollectError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

let devP: Promise<string> | null = null;
function deviceLabel(): Promise<string> {
  if (devP) return devP;
  devP = (async () => {
    const ua = navigator.userAgent;
    const ios = ua.match(/(iPhone|iPad|iPod).*? OS (\d+)[_.](\d+)/);
    const and = ua.match(/Android (\d+(?:\.\d+)?)(?:; ([^;)]+))?/);
    let model = ios ? ios[1] : and?.[2]?.trim() && !/^K$|Linux/.test(and[2]) ? and[2].trim() : /Mac/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows PC' : '';
    try {
      const uad = (navigator as Navigator & { userAgentData?: { getHighEntropyValues(h: string[]): Promise<{ model?: string }> } }).userAgentData;
      if (uad) {
        const h = await uad.getHighEntropyValues(['model']);
        if (h.model) model = h.model;
      }
    } catch {}
    const os = ios ? `iOS ${ios[2]}.${ios[3]}` : and ? `Android ${and[1]}` : '';
    const br = /SamsungBrowser/.test(ua) ? 'Samsung Internet' : /KAKAOTALK/i.test(ua) ? '카카오톡' : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : '';
    return [model, os, br].filter(Boolean).join(', ').slice(0, 110);
  })();
  return devP;
}

export async function who() {
  return { device_key: await deviceKey(), fp: await fingerprint(), device: await deviceLabel() };
}

async function post<T>(path: string, body: object): Promise<T> {
  const res = await fetch(`${API_BASE}/collect${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  if (!res.ok) {
    let msg = '연결이 불안정합니다. 다시 시도';
    try {
      const d = (await res.json()).detail;
      if (typeof d === 'string') msg = d;
      // 서버가 칸 형식으로 막는 일은 이제 거의 없다 — 그래도 오면 어느 칸인지 같이 보인다
      else if (Array.isArray(d)) msg = `형식이 안 맞는 칸: ${d.map((x: { loc?: unknown[] }) => (x.loc ?? []).slice(-1)[0]).filter(Boolean).join(', ') || '알 수 없음'}`;
    } catch {}
    throw new CollectError(res.status, msg);
  }
  return res.json();
}

export const api = {
  whoami: async () => post<{ collector: Collector | null; cap: Cap }>('/whoami', await who()),
  join: async (name: string, confirm = false) =>
    post<{ exists: boolean; name?: string; collector?: Collector; cap: Cap }>('/join', { ...(await who()), name, confirm }),
  photo: async (slot: Slot, image: string) => post<{ photo_id: string }>('/photo', { ...(await who()), slot, image }),
  // 그 칸 사진(1~5장)을 한 번에 판독. tier = 모델 사다리 칸, previousRead = 다시 읽기 때 앞 판독(다르게 읽은 칸을 맞대 보인다)
  // editing = 고치는 중인 제출 id — 그 제출에 묶인 사진도 다시 읽는다 · 바코드가 자기 자신과 겹치지 않는다
  read: async (slot: Slot, photoIds: string[], tier = 0, previousRead?: string, editing?: number) =>
    post<{ read_id: string; read: Read; barcode_status?: BarcodeStatus; rotated?: string[] }>('/read', {
      ...(await who()), slot, photo_ids: photoIds, tier, previous_read: previousRead ?? null, editing: editing ?? null,
    }),
  barcodeCheck: (barcode: string, editing?: number) => post<BarcodeStatus>('/barcode-check', { barcode, editing: editing ?? null }),
  submit: async (photos: Record<Slot, string[]>, reads: Partial<Record<Slot, string[]>>, fields: object) =>
    post<{ id: number; reward_won?: number | null; cap: Cap; me: Me }>('/submit', { ...(await who()), photos, reads, fields }),
  board: async () => post<Board>('/board', await who()),
  mine: async (id: number) => post<MineDetail>('/mine', { ...(await who()), id }),
  cancel: async (id: number) => post<{ id: number; cap: Cap; me: Me }>('/cancel', { ...(await who()), id }),
  resubmit: async (id: number, photos: Record<Slot, string[]>, reads: Partial<Record<Slot, string[]>>, fields: object) =>
    post<{ id: number; cap: Cap; me: Me }>('/resubmit', { ...(await who()), id, photos, reads, fields }),
};

export async function thumbUrl(photoId: string): Promise<string> {
  return `${API_BASE}/collect/thumb/${photoId}?k=${encodeURIComponent(await deviceKey())}`;
}

/** 고른 사진 → 긴 변 2000 px JPEG data URI. 방향(EXIF)을 바로잡아 그린다 · HEIC 는 iOS Safari 가 넘겨줄 때 이미 JPEG 다. */
/** 고른 사진 → data URI. **줄이지 않는다**(2026-11-06 사용자 「올린 사진 보고 판단해야 하는데 임의로 축소하면 확인이 어렵다」) —
 *  JPEG · PNG · WEBP 는 파일 그대로, 그 밖(HEIC 등 서버가 못 여는 형식)만 같은 크기 JPEG(품질 0.95)으로 바꾼다. 방향(EXIF)은 서버가 읽을 때 세운다. */
export async function shrink(file: File): Promise<string> {
  if (/^image\/(jpeg|png|webp)$/i.test(file.type)) {
    return new Promise<string>((ok, bad) => {
      const r = new FileReader();
      r.onload = () => ok(String(r.result));
      r.onerror = () => bad(new Error('사진을 열지 못했습니다.'));
      r.readAsDataURL(file);
    });
  }
  let src: ImageBitmap | HTMLImageElement;
  try {
    src = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
  } catch {
    src = await new Promise<HTMLImageElement>((ok, bad) => {
      const im = new Image();
      im.onload = () => ok(im);
      im.onerror = () => bad(new Error('사진을 열지 못했습니다.'));
      im.src = URL.createObjectURL(file);
    });
  }
  const c = document.createElement('canvas');
  c.width = 'naturalWidth' in src ? src.naturalWidth : src.width;
  c.height = 'naturalHeight' in src ? src.naturalHeight : src.height;
  const g = c.getContext('2d');
  if (!g) throw new Error('사진을 열지 못했습니다.');
  g.drawImage(src, 0, 0);
  return c.toDataURL('image/jpeg', 0.95);
}

/** GTIN-8 · 12 · 13 · 14 검사 자리(서버 label_reader.gtin_valid 와 같다) — 입력하는 동안 바로 알려 주려고. */
export function gtinValid(code: string): boolean {
  if (!/^\d+$/.test(code) || ![8, 12, 13, 14].includes(code.length)) return false;
  const body = code.slice(0, -1).split('').reverse();
  const sum = body.reduce((s, d, i) => s + Number(d) * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === Number(code[code.length - 1]);
}

export const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;
/** 이벤트 시각(KST ISO) → 「11/8(토) 23시」 — 분이 0 이 아니면 「23:30」 */
export const whenKo = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso);
  if (!m) return iso;
  const day = '일월화수목금토'[new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay()];
  return `${+m[2]}/${+m[3]}(${day}) ${m[5] === '00' ? `${+m[4]}시` : `${m[4]}:${m[5]}`}`;
};
