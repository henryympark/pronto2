// Main barrel export for shared module
// Provides clean imports from shared resources

// Re-export all shared modules
export * from './components/ui';
export * from './hooks';
export * from './utils';
export * from './types';
export * from './constants';

// This allows imports like:
// import { Button, useToast, cn } from '@/shared';