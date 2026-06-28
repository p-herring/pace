'use client';

/**
 * NativeInit — rendered once in the root layout.
 * Bootstraps Capacitor native plugins when running inside the iOS shell.
 * In a browser or during SSR this component renders nothing and does nothing.
 */

import { useEffect } from 'react';
import { initNative } from '@/lib/capacitor';

export default function NativeInit() {
  useEffect(() => {
    initNative().catch(console.error);
  }, []);

  return null;
}
