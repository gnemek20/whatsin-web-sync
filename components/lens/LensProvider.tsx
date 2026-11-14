'use client';
// 내 기준을 화면 전체에 나눠 준다. 처음 값은 서버가 쿠키에서 읽어 넘긴다(서버 · 브라우저가 같은 값으로 그려 깜빡이지 않는다).
// 저장하면 쿠키를 쓰고 서버 화면을 다시 그린다(router.refresh) — 상세의 「들었나」는 서버가 avoid= 로 다시 받아 온다.
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
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

export function LensProvider({ initial, children }: { initial: Lens | null; children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname() ?? '';
  const bare = path.startsWith('/collect'); // 수집 아르바이트 도구에는 온보딩을 띄우지 않는다
  const [lens, setLens] = useState<Lens | null>(initial);
  // 처음 온 사람(기준 없음)은 온보딩을 연다 — 닫기 단추가 없다(사용자 2026-11-13 「반드시 모달로 온보딩을 시작」).
  const [editor, setEditor] = useState<{ open: boolean; step: number }>({ open: !initial, step: 0 });

  const save = useCallback(
    (l: Lens) => {
      document.cookie = `${LENS_COOKIE}=${serializeLens(l)}; Max-Age=${YEAR}; Path=/; SameSite=Lax`;
      setLens(l);
      setEditor({ open: false, step: 0 });
      router.refresh();
    },
    [router],
  );

  const reset = useCallback(() => {
    document.cookie = `${LENS_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
    setLens(null);
    setEditor({ open: true, step: 0 });
    router.refresh();
  }, [router]);

  const openEditor = useCallback((step = 0) => setEditor({ open: true, step }), []);

  const value = useMemo(() => ({ lens, save, reset, openEditor }), [lens, save, reset, openEditor]);
  return (
    <LensCtx.Provider value={value}>
      {children}
      {editor.open && !bare ? (
        <Onboarding
          initial={lens}
          startStep={editor.step}
          dismissible={!!lens}
          onClose={() => setEditor({ open: false, step: 0 })}
          onSave={save}
          onReset={reset}
        />
      ) : null}
    </LensCtx.Provider>
  );
}
