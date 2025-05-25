// Barrel export for shared hooks
export { useIsMounted } from './useIsMounted';
export { useToast, toast } from './useToast';
export { useApi, apiRequest } from './useApi';

// Re-export with original names for backward compatibility
export { useToast as useToast } from './useToast';
export { useApi as useApi } from './useApi';