import { DashboardShell } from '@/components/layout/DashboardShell';
import { NotificacionesCampana } from '@/components/layout/NotificacionesCampana';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell headerEnd={<NotificacionesCampana />}>{children}</DashboardShell>;
}
