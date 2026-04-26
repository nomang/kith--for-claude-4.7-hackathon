'use client';

import dynamic from 'next/dynamic';

const HeyKith = dynamic(() => import('./HeyKith'), { ssr: false });

export default function HeyKithLoader() {
  return <HeyKith />;
}
