'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { trpc } from '@/lib/trpc/client';
import { Check } from 'lucide-react';
import { useState } from 'react';

export type NivelHabilidad = 'BASICO' | 'INTERMEDIO' | 'AVANZADO' | 'EXPERTO';

const NIVEL_LABELS: Record<NivelHabilidad, string> = {
  BASICO: 'Básico',
  INTERMEDIO: 'Intermedio',
  AVANZADO: 'Avanzado',
  EXPERTO: 'Experto',
};

type Props = {
  open: boolean;
  onClose: () => void;
  onAdd: (habilidadId: string, nombre: string, nivel: NivelHabilidad) => void;
  /** IDs already added — shown as disabled */
  existingIds?: string[];
};

export function HabilidadesSelector({ open, onClose, onAdd, existingIds = [] }: Props) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<{ id: string; nombre: string } | null>(null);
  const [nivel, setNivel] = useState<NivelHabilidad>('INTERMEDIO');

  const { data, isLoading } = trpc.egresados.listarHabilidades.useQuery(
    { search: search.trim() || undefined },
    { enabled: open, keepPreviousData: true },
  );

  function handleAdd() {
    if (!selected) return;
    onAdd(selected.id, selected.nombre, nivel);
    setSelected(null);
    setSearch('');
    setNivel('INTERMEDIO');
    onClose();
  }

  function handleClose() {
    setSelected(null);
    setSearch('');
    setNivel('INTERMEDIO');
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar habilidad</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="hs-search">Buscar habilidad</Label>
            <Input
              id="hs-search"
              placeholder="Ej. Python, Liderazgo…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="max-h-52 overflow-y-auto rounded-md border">
            {isLoading ? (
              <div className="space-y-1 p-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : (data ?? []).length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">Sin resultados.</p>
            ) : (
              <ul className="divide-y">
                {(data ?? []).map((h) => {
                  const alreadyAdded = existingIds.includes(h.id);
                  const isSelected = selected?.id === h.id;
                  return (
                    <li key={h.id}>
                      <button
                        type="button"
                        disabled={alreadyAdded}
                        onClick={() => setSelected(isSelected ? null : { id: h.id, nombre: h.nombre })}
                        className={[
                          'flex w-full items-center justify-between px-3 py-2 text-sm transition-colors',
                          alreadyAdded
                            ? 'cursor-not-allowed opacity-40'
                            : isSelected
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted',
                        ].join(' ')}
                      >
                        <span>
                          {h.nombre}
                          <span className="ml-2 text-xs opacity-60">{h.tipo}</span>
                        </span>
                        {isSelected && <Check className="h-4 w-4" />}
                        {alreadyAdded && (
                          <Badge variant="secondary" className="text-xs">
                            Ya agregada
                          </Badge>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {selected && (
            <div className="space-y-1.5">
              <Label>Nivel para &ldquo;{selected.nombre}&rdquo;</Label>
              <Select value={nivel} onValueChange={(v) => setNivel(v as NivelHabilidad)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(NIVEL_LABELS) as NivelHabilidad[]).map((n) => (
                    <SelectItem key={n} value={n}>
                      {NIVEL_LABELS[n]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="button" disabled={!selected} onClick={handleAdd}>
            Agregar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
