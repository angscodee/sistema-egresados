'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNotificaciones } from '@/hooks/useNotificaciones';
import { cn } from '@/lib/utils';

function formatFecha(iso: string | Date) {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' });
}

export function NotificacionesCampana() {
  const { items, unreadCount, isLoading, marcarLeida, marcarTodasLeidas } = useNotificaciones();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="relative shrink-0" aria-label="Notificaciones">
          <span className="text-lg" aria-hidden>
            🔔
          </span>
          {unreadCount > 0 ? (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-semibold"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96">
        <DropdownMenuLabel className="flex items-center justify-between gap-2">
          <span>Notificaciones</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            disabled={unreadCount === 0 || marcarTodasLeidas.isPending}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              marcarTodasLeidas.mutate();
            }}
          >
            Marcar todas leídas
          </Button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">Cargando…</p>
          ) : items.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">No hay notificaciones.</p>
          ) : (
            items.map((n) => (
              <DropdownMenuItem
                key={n.id}
                className={cn('flex cursor-pointer flex-col items-start gap-1 py-3', !n.leida && 'font-semibold')}
                onSelect={(e) => {
                  e.preventDefault();
                  if (!n.leida) {
                    marcarLeida.mutate({ id: n.id });
                  }
                }}
              >
                <span className="text-sm leading-snug">{n.titulo}</span>
                <span className="text-xs font-normal text-muted-foreground">{n.contenido}</span>
                <span className="text-[11px] font-normal text-muted-foreground">{formatFecha(n.createdAt)}</span>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
