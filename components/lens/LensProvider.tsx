'use client';
// 내 기준을 화면 전체에 나눠 준다. 처음 값은 서버가 쿠키에서 읽어 넘긴다(서버 · 브라우저가 같은 값으로 그려 깜빡이지 않는다).
// 저장하면 쿠키를 쓰고 서버 화면을 다시 그린다(router.refresh) — 상세의 「들었나」는 서버가 avoid= 로 다시 받아 온다.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { LENS_COOKIE, serializeLens, type Lens } from '@/lib/lens';
import { Onboarding } from './Onboarding';

type Ctx = {
  lens: Lens | null;
  save: (l: Lens) => void;
  reset: () => void;
  openEditor: (step?: number) => void;
};

const LensCtx = createContext<Ctx>({ lens: null, save: () => {}, reset: () => {}, openEditor: () => {} });
export const useLens = () => useContext(LensCtx);

const YEAR = 60 * 60 * 24 * 365;
const SKIP = 'wi_ob_skip'; // sessionStorage — 처음 온 사람이 온보딩을 닫으면 이번 접속(탭) 동안 다시 띄우지 않는다

export function LensProvider({ initial, children }: { initial: Lens | null; children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname() ?? '';
  const bare = path.startsWith('/collect'); // 수집 아르바이트 도구에는 온보딩을 띄우지 않는다
  const [lens, setLens] = useState<Lens | null>(initial);
  // 처음 온 사람(기준 없음)은 온보딩을 연다(사용자 2026-11-13 「반드시 모달로 온보딩을 시작」).
  // 2026-11-16 — 바로 닫을 수 있다. 닫으면 이번 접속 동안은 다시 띄우지 않고 머리 「내 기준」으로 연다.
  // n — 창을 새로 띄울 때마다 올린다(「처음부터」가 남은 단계 · 고른 값을 들고 마지막 화면에 머물지 않게).
  const [editor, setEditor] = useState<{ open: boolean; step: number; n: number }>({ open: !initial, step: 0, n: 0 });

  useEffect(() => {
    try {
      if (!initial && sessionStorage.getItem(SKIP)) setEditor((e) => ({ ...e, open: false }));
    } catch {}
    // 처음 그릴 때 한 번만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = useCallback(
    (l: Lens) => {
      document.cookie = `${LENS_COOKIE}=${serializeLens(l)}; Max-Age=${YEAR}; Path=/; SameSite=Lax`;
      setLens(l);
      setEditor((e) => ({ open: false, step: 0, n: e.n + 1 }));
      router.refresh();
    },
    [router],
  );

  const reset = useCallback(() => {
    document.cookie = `${LENS_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
    setLens(null);
    setEditor((e) => ({ open: true, step: 1, n: e.n + 1 }));
    router.refresh();
  }, [router]);

  const openEditor = useCallback((step = 0) => setEditor((e) => ({ open: true, step, n: e.n + 1 })), []);
  const close = useCallback(() => {
    try {
      sessionStorage.setItem(SKIP, '1');
    } catch {}
    setEditor((e) => ({ ...e, open: false }));
  }, []);

  const value = useMemo(() => ({ lens, save, reset, openEditor }), [lens, save, reset, openEditor]);
  return (
    <LensCtx.Provider value={value}>
      {children}
      {editor.open && !bare ? (
        <Onboarding
          key={editor.n}
          initial={lens}
          startStep={editor.step}
          onClose={close}
          onSave={save}
          onReset={reset}
        />
      ) : null}
    </LensCtx.Provider>
  );
}
