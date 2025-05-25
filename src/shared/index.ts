// Main barrel export for shared module
// Provides clean imports from shared resources

// Re-export all shared modules
export * from './components/ui';
export * from './hooks';
export * from './utils';
export * from './types';
export * from './constants';

// This allows imports like:
// import { Button, useToast, cn, ErrorCode, API_PATHS } from '@/shared';

// Common combinations for convenience
export { cn } from './utils';
export { useToast, toast } from './hooks';
export { Button, Input, Card } from './components/ui';
export { ErrorCode, ErrorSeverity, AppError } from './types';
export { API_PATHS, ROUTES, CACHE_KEYS } from './constants';