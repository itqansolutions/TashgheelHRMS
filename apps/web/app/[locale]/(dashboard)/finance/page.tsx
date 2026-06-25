'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function FinancePage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  useEffect(() => {
    router.replace(`/${locale}/finance/invoices`);
  }, [router, locale]);

  return null;
}
