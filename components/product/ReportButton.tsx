'use client';
// 오류 신고 버튼 — 상세 맨 아래 「정보가 다른가요?」(2026-11-04 사용자 「앱과 웹 모두」). 창(ReportSheet)은 누를 때 받는다 —
// 첫 화면 번들을 가볍게(next/dynamic · ssr 없음). 누르는 순간 준비해 두려고 마우스가 올라오거나 손가락이 닿으면 미리 받는다.
import dynamic from 'next/dynamic';
import { useCallback, useState } from 'react';
import { Icon } from '../Icon';
import styles from './product.module.css';

const load = () => import('./ReportSheet');
const ReportSheet = dynamic(load, { ssr: false });

export function ReportButton({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button
        type="button"
        className={`t-caption ${styles.report}`}
        onPointerEnter={load}
        onFocus={load}
        onClick={() => setOpen(true)}
      >
        <Icon name="alert" size={16} />
        정보가 다르면 오류 신고
      </button>
      {open ? <ReportSheet id={id} name={name} onClose={close} /> : null}
    </>
  );
}
