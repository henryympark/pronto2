// Barrel export for shared types
export * from './common';

// Re-export commonly used types for convenience
export type {
  BaseEntity,
  ApiResponse,
  PaginationParams,
  Option,
  Result,
  LoadingState,
  ColorVariant,
  Size
} from './common';

export {
  ErrorSeverity,
  ErrorCode,
  AppError
} from './common';