'use client';

import React from 'react';
import { AuthProvider } from '@/components/layout/AuthProvider';

export default function Providers({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
