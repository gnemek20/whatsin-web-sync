// 방문 집계(브라우저 쪽) — 서버 정본은 backend/app/db/visits.py. 여기서는 기기 키 · 유입 경로를 만들어 보낸다(2026-11-03 사용자).
// 같은 기기를 두 겹으로 알아본다(2026-11-03 점검 뒤 고침 · 서버 backend/app/db/visits.py):
//   기기 키(deviceKey) = 브라우저에 저장한 고유 ID(localStorage + 쿠키) — 네트워크가 바뀌어도 같다.
//   지문(fingerprint) = 브라우저 특성의 SHA-256 — 시크릿 창 · 저장소 삭제로 키가 새로 생겨도, 그날 같은 지문 + 같은 IP 면 서버가 같은 기기로 본다.
//   지문만 키로 쓰면 Safari(캔버스 못 씀)의 같은 기종 iPhone 이 한 기기로 뭉쳐 방문자를 크게 적게 셌다 — 그래서 「같은 네트워크 안」에서만 쓴다.
//   Safari 비공개 창은 캔버스에 잡음을 섞으므로 Safari 에서는 캔버스를 빼고 만든다.
// 서버로는 우리 사이트의 /api/v/* 를 거친다(app/api/v/[op]/route.ts) — CORS 없이, 실제 접속 IP 를 붙여 API 로 넘긴다.

const DAY_KEY = 'wi_v_day';
const ACTIVE_KEY = 'wi_a_day';
const SRC_KEY = 'wi_src';

export function kstDay(): string {
  return new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
}

function canvasSig(): string {
  try {
    const c = document.createElement('canvas');
    c.width = 220;
    c.height = 40;
    const g = c.getContext('2d');
    if (!g) return '';
    g.textBaseline = 'top';
    g.font = "16px 'Arial'";
    g.fillStyle = '#f60';
    g.fillRect(0, 0, 100, 20);
    g.fillStyle = '#069';
    g.fillText('와츠인 What’s In? 🍙', 2, 4);
    return c.toDataURL();
  } catch {
    return '';
  }
}

function glSig(): string {
  try {
    const c = document.createElement('canvas');
    const gl = (c.getContext('webgl') || c.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) return '';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? `${gl.getParameter(ext.UNMASKED_VENDOR_WEBGL)}|${gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)}` : String(gl.getParameter(gl.RENDERER));
  } catch {
    return '';
  }
}

const ID_KEY = 'wi_did';

function readCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([A-Za-z0-9_-]+)`));
  return m ? m[1] : null;
}

let idP: Promise<string> | null = null;

/** 브라우저에 저장한 고유 ID — localStorage 와 쿠키 둘 다(한쪽이 지워져도 다른 쪽에서 되살린다). */
export function deviceKey(): Promise<string> {
  if (idP) return idP;
  idP = (async () => {
    let id: string | null = null;
    try {
      id = localStorage.getItem(ID_KEY);
    } catch {}
    id = id || readCookie(ID_KEY);
    if (!id || !/^[A-Za-z0-9_-]{8,80}$/.test(id)) {
      const b = new Uint8Array(16);
      crypto.getRandomValues(b);
      id = 'd' + Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
    }
    try {
      localStorage.setItem(ID_KEY, id);
    } catch {}
    document.cookie = `${ID_KEY}=${id}; path=/; max-age=34560000; samesite=lax${location.protocol === 'https:' ? '; secure' : ''}`;
    return id;
  })();
  return idP;
}

let keyP: Promise<string> | null = null;

/** 브라우저 특성 지문 — 키가 아니라 시크릿 창을 같은 기기로 묶는 보조(같은 IP 일 때만 서버가 쓴다). */
export function fingerprint(): Promise<string> {
  if (keyP) return keyP;
  keyP = (async () => {
    const n = navigator as Navigator & { deviceMemory?: number };
    const ua = n.userAgent;
    const safari = /Safari\//.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS|Android/.test(ua);
    const parts = [
      ua, n.language, (n.languages || []).join(','), n.platform, n.hardwareConcurrency, n.deviceMemory ?? '', n.maxTouchPoints,
      screen.width, screen.height, screen.colorDepth, window.devicePixelRatio,
      Intl.DateTimeFormat().resolvedOptions().timeZone, glSig(), safari ? '' : canvasSig(),
    ].join('§');
    try {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(parts));
      return 'w' + btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '').slice(0, 32);
    } catch {
      // crypto.subtle 이 없는 옛 브라우저 — 간단한 해시
      let h = 0;
      for (let i = 0; i < parts.length; i++) h = (Math.imul(31, h) + parts.charCodeAt(i)) | 0;
      return 'w' + Math.abs(h).toString(36).padStart(10, '0');
    }
  })();
  return keyP;
}

type Src = { utm_source?: string; utm_medium?: string; utm_campaign?: string; ref?: string; referrer?: string; landing_path?: string };

// 첫 페이지의 유입 정보 — 같은 탭에서 다른 페이지로 옮겨도 처음 것을 쓴다.
export function source(): Src {
  try {
    const saved = sessionStorage.getItem(SRC_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  const q = new URLSearchParams(location.search);
  const s: Src = {
    utm_source: q.get('utm_source') ?? undefined,
    utm_medium: q.get('utm_medium') ?? undefined,
    utm_campaign: q.get('utm_campaign') ?? undefined,
    ref: q.get('ref') ?? undefined,
    referrer: document.referrer || undefined,
    landing_path: location.pathname,
  };
  try {
    sessionStorage.setItem(SRC_KEY, JSON.stringify(s));
  } catch {}
  return s;
}

function osOf(): string {
  const ua = navigator.userAgent;
  return /Android/.test(ua) ? 'android' : /iPhone|iPad|iPod/.test(ua) ? 'ios' : /Mac/.test(ua) ? 'mac' : /Windows/.test(ua) ? 'windows' : 'other';
}

// 기기 설명 — 「SM-S918N, Android 14, Chrome」 · 「iPhone, iOS 18.1, Safari」 · 「Mac, Chrome」. 기종명은 크롬 계열이 알려 줄 때만(Android).
// iPhone 은 브라우저가 기종을 알려 주지 않는다(화면 크기로 짐작하지 않는다 — 같은 크기의 기종이 여럿이다).
async function deviceInfo(): Promise<string> {
  const ua = navigator.userAgent;
  const browser = /SamsungBrowser/.test(ua) ? 'Samsung Internet' : /KAKAOTALK/i.test(ua) ? '카카오톡' : /NAVER\(inapp/i.test(ua) ? '네이버 앱'
    : /Instagram/.test(ua) ? 'Instagram' : /FBAN|FBAV/.test(ua) ? 'Facebook' : /Edg\//.test(ua) ? 'Edge' : /Whale/.test(ua) ? 'Whale'
    : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /FxiOS|Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : '기타';
  let model = '', osv = '';
  const ios = ua.match(/(iPhone|iPad|iPod).*? OS (\d+)[_.](\d+)/);
  const and = ua.match(/Android (\d+(?:\.\d+)?)(?:; ([^;)]+))?/);
  if (ios) { model = ios[1]; osv = `iOS ${ios[2]}.${ios[3]}`; }
  else if (and) { osv = `Android ${and[1]}`; if (and[2] && and[2] !== 'K' && !/Linux/.test(and[2])) model = and[2].trim(); }
  else if (/Macintosh/.test(ua)) model = navigator.maxTouchPoints > 1 ? 'iPad' : 'Mac';
  else if (/Windows/.test(ua)) model = 'Windows PC';
  try {
    const uad = (navigator as Navigator & { userAgentData?: { getHighEntropyValues(h: string[]): Promise<{ model?: string; platformVersion?: string; platform?: string }> } }).userAgentData;
    if (uad) {
      const h = await uad.getHighEntropyValues(['model', 'platformVersion']);
      if (h.model) model = h.model;
      if (h.platform === 'Android' && h.platformVersion) osv = `Android ${h.platformVersion.split('.')[0]}`;
    }
  } catch {}
  return [model, osv, browser].filter(Boolean).join(', ').slice(0, 110);
}

function send(op: string, body: object) {
  const data = JSON.stringify(body);
  try {
    if (navigator.sendBeacon && navigator.sendBeacon(`/api/v/${op}`, new Blob([data], { type: 'application/json' }))) return;
  } catch {}
  fetch(`/api/v/${op}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: data, keepalive: true }).catch(() => {});
}

function once(storageKey: string): boolean {
  // 같은 브라우저에서 하루 한 번만 보낸다(서버도 중복을 무시하니 저장소가 없어도 틀리지 않는다).
  try {
    if (localStorage.getItem(storageKey) === kstDay()) return false;
    localStorage.setItem(storageKey, kstDay());
  } catch {}
  return true;
}

export async function trackVisit() {
  const s = source();
  if (!once(DAY_KEY)) return;
  send('ping', { platform: 'web', device_key: await deviceKey(), fp: await fingerprint(), kind: 'visit', os: osOf(), device: await deviceInfo(), ...s });
}

export async function trackActive(action: 'search' | 'product_view') {
  if (!once(ACTIVE_KEY)) return;
  send('ping', { platform: 'web', device_key: await deviceKey(), fp: await fingerprint(), kind: 'active', action });
}

export async function trackAppClick(store: 'ios' | 'android') {
  const s = source();
  send('app-click', { web_device_key: await deviceKey(), store, os: osOf(), utm_source: s.utm_source, ref: s.ref, referrer: s.referrer, utm_campaign: s.utm_campaign });
}

export function isAndroid(): boolean {
  return typeof navigator !== 'undefined' && /Android/.test(navigator.userAgent);
}
