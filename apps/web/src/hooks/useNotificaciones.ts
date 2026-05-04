'use client';

import { useAuth } from '@/lib/auth-context';
import { getApiUrl } from '@/lib/api-url';
import { trpc } from '@/lib/trpc/client';
import { useEffect, useMemo } from 'react';
import { io } from 'socket.io-client';
import type { NotificacionItem } from '@/lib/api-types';

export function useNotificaciones() {
  const { user, token, isReady } = useAuth();
  const utils = trpc.useUtils();

  const enabled = isReady && Boolean(token) && Boolean(user);

  const listQuery = trpc.notificaciones.mis.useQuery(undefined, {
    enabled,
  });

  const marcarLeida = trpc.notificaciones.marcarLeida.useMutation({
    onSuccess: () => {
      void utils.notificaciones.mis.invalidate();
    },
  });

  const marcarTodasLeidas = trpc.notificaciones.marcarTodasLeidas.useMutation({
    onSuccess: () => {
      void utils.notificaciones.mis.invalidate();
    },
  });

  useEffect(() => {
    if (!enabled || !token) return;

    const socket = io(getApiUrl(), {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    const onNueva = () => {
      void utils.notificaciones.mis.invalidate();
    };

    socket.on('nueva-notificacion', onNueva);

    return () => {
      socket.off('nueva-notificacion', onNueva);
      socket.disconnect();
    };
  }, [enabled, token, utils]);

  const items: NotificacionItem[] = useMemo(
    () => (listQuery.data ?? []) as NotificacionItem[],
    [listQuery.data],
  );

  const unreadCount = useMemo(() => items.filter((n) => !n.leida).length, [items]);

  return {
    items,
    unreadCount,
    isLoading: listQuery.isLoading,
    isError: listQuery.isError,
    refetch: listQuery.refetch,
    marcarLeida,
    marcarTodasLeidas,
  };
}
