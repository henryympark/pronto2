// Barrel export for UI components
// Core components that have been moved to shared
export { Button, buttonVariants } from './button';
export { Input } from './input';
export { Label } from './label';
export { Checkbox } from './checkbox';
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from './card';

// Temporary exports for components still in old location
// These will be moved gradually to avoid breaking changes
export { default as Accordion } from '../../../components/ui/accordion';
export { default as AlertDialog } from '../../../components/ui/alert-dialog';
export { default as Alert } from '../../../components/ui/alert';
export { default as Avatar } from '../../../components/ui/avatar';
export { default as Badge } from '../../../components/ui/badge';
export { default as Calendar } from '../../../components/ui/calendar';
export { default as Dialog } from '../../../components/ui/dialog';
export { default as DropdownMenu } from '../../../components/ui/dropdown-menu';
export { default as ErrorBoundary } from '../../../components/ui/error-boundary';
export { default as FileUpload } from '../../../components/ui/file-upload';
export { default as Form } from '../../../components/ui/form';
export { default as Logos } from '../../../components/ui/logos';
export { default as MonthYearNavigator } from '../../../components/ui/month-year-navigator';
export { default as MonthYearNavigatorMinimal } from '../../../components/ui/month-year-navigator-minimal';
export { default as Select } from '../../../components/ui/select';
export { default as Separator } from '../../../components/ui/separator';
export { default as Sheet } from '../../../components/ui/sheet';
export { default as Skeleton } from '../../../components/ui/skeleton';
export { default as Tabs } from '../../../components/ui/tabs';
export { default as Textarea } from '../../../components/ui/textarea';
export { default as Toast } from '../../../components/ui/toast';
export { default as Toaster } from '../../../components/ui/toaster';

// Type exports
export type { ButtonProps } from './button';
export type { InputProps } from './input';

// Note: This is a transitional setup. 
// In the next steps, we'll move all components to the shared folder
// and update all import statements throughout the application.
