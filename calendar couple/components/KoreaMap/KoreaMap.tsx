"use client";

import dynamic from "next/dynamic";

const KoreaMapInner = dynamic(() => import("./KoreaMapInner"), { ssr: false });

interface Props {
  getSidoVisitCount: (code: string) => number;
  getSigunguVisitCount: (code: string) => number;
  onSigunguSelect: (sigunguCode: string, sigunguName: string, sidoName: string) => void;
}

export default function KoreaMap(props: Props) {
  return <KoreaMapInner {...props} />;
}
