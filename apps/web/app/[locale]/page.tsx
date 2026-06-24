'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function LocaleIndexPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  useEffect(() => {
    // Check if token exists in cookies
    const token = document.cookie
      .split('; ')
      .find((row) => row.startsWith('token='))
      ?.split('=')[1];

    if (token) {
      router.replace(`/${locale}/dashboard`);
    } else {
      router.replace(`/${locale}/login`);
    }
  }, [router, locale]);

  return (
    <div className="flex h-screen items-center justify-center bg-[#F5F7FB]">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#00B67A] border-t-transparent"></div>
    </div>
  );
}
