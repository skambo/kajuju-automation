import { Suspense } from 'react';
import AnniversaryClient from '@/components/AnniversaryClient';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AnniversaryClient />
    </Suspense>
  );
}
