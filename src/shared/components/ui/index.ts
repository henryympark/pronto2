/**
 * Shared UI Components Index
 * 공통 UI 컴포넌트들을 통합하여 제공
 */

// Core components that have been moved to shared
export { Button, buttonVariants } from './button';
export { Input } from './input';
export { Label } from './label';
export { Checkbox } from './checkbox';
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from './card';

// Re-export all UI components from the main components/ui directory
export * from '../../../components/ui/accordion';
export * from '../../../components/ui/alert-dialog';
export * from '../../../components/ui/alert';
export * from '../../../components/ui/avatar';
export * from '../../../components/ui/badge';
export * from '../../../components/ui/button';
export * from '../../../components/ui/calendar';
export * from '../../../components/ui/card';
export * from '../../../components/ui/checkbox';
export * from '../../../components/ui/dialog';
export * from '../../../components/ui/dropdown-menu';
export * from '../../../components/ui/form';
export * from '../../../components/ui/input';
export * from '../../../components/ui/label';
export * from '../../../components/ui/select';
export * from '../../../components/ui/separator';
export * from '../../../components/ui/sheet';
export * from '../../../components/ui/switch';
export * from '../../../components/ui/table';
export * from '../../../components/ui/tabs';
export * from '../../../components/ui/textarea';
export * from '../../../components/ui/toast';
export * from '../../../components/ui/toaster';

// Type exports
export type { ButtonProps } from './button';
export type { InputProps } from './input';
