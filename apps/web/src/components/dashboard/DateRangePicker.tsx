'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type DateRangeValue = {
  startDate: string;
  endDate: string;
};

type DateRangePickerProps = {
  value: DateRangeValue;
  onChange: (next: DateRangeValue) => void;
  idPrefix?: string;
};

/**
 * Selector de rango con inputs nativos (sin dependencias extra).
 * Las fechas se manejan como `YYYY-MM-DD` para coincidir con `<input type="date" />`.
 */
export function DateRangePicker({ value, onChange, idPrefix = 'range' }: DateRangePickerProps) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-start`}>Desde</Label>
        <Input
          id={`${idPrefix}-start`}
          type="date"
          value={value.startDate}
          onChange={(e) => onChange({ ...value, startDate: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-end`}>Hasta</Label>
        <Input
          id={`${idPrefix}-end`}
          type="date"
          value={value.endDate}
          onChange={(e) => onChange({ ...value, endDate: e.target.value })}
        />
      </div>
    </div>
  );
}
