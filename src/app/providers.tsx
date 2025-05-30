// In Next.js, this file would be called: app/providers.tsx
'use client';

import { ReactNode } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { SupabaseProvider } from '@/contexts/SupabaseContext';
import { AuthProvider } from '@/contexts/AuthContext';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SupabaseProvider>
      <AuthProvider>
        {children}
        <Toaster />
      </AuthProvider>
    </SupabaseProvider>
  );
}
