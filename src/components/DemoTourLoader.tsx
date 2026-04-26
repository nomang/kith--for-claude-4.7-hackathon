'use client';

import dynamic from 'next/dynamic';

const DemoTour = dynamic(() => import('./DemoTour').then(m => m.default), { ssr: false });

export default function DemoTourLoader() {
  return <DemoTour />;
}
