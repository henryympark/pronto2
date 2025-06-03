import { ServiceLayout } from '@/components/layout/ServiceLayout';

export default function ServiceRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ServiceLayout>{children}</ServiceLayout>;
} 