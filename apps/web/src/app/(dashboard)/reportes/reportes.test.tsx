/**
 * Tests for ReportesPage
 * - Renders the report type selector
 * - "Generar PDF" button triggers the generateReport mutation
 * - Shows history table with skeleton while loading
 * - Shows "Listo" badge for completed reports
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks — must use vi.hoisted so factories run before imports ───────────────
const { mockMutateAsync, mockGenerateMutation, mockListQuery, mockInvalidate } = vi.hoisted(() => {
  const mockMutateAsync = vi.fn().mockResolvedValue({ id: 'rep-1' });
  const mockGenerateMutation = {
    mutateAsync: mockMutateAsync,
    isLoading: false,
    isError: false,
  };
  const mockListQuery = vi.fn();
  const mockInvalidate = vi.fn();
  return { mockMutateAsync, mockGenerateMutation, mockListQuery, mockInvalidate };
});

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ user: { id: 'admin-1', role: 'ADMIN' } }),
}));

vi.mock('@/lib/api-url', () => ({ getApiUrl: () => 'http://localhost:3001' }));

vi.mock('@/lib/trpc/client', () => ({
  trpc: {
    reportes: {
      generateReport: { useMutation: vi.fn(() => mockGenerateMutation) },
      getHistorialReportes: { useQuery: mockListQuery },
    },
    useUtils: () => ({
      reportes: { getHistorialReportes: { invalidate: mockInvalidate } },
    }),
  },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import ReportesPage from './page';

describe('ReportesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isSuccess: true,
    });
  });

  it('renderiza el selector de tipo de reporte', () => {
    render(<ReportesPage />);
    expect(screen.getByLabelText(/tipo de reporte/i)).toBeInTheDocument();
  });

  it('renderiza el botón "Generar PDF"', () => {
    render(<ReportesPage />);
    expect(screen.getByRole('button', { name: /generar pdf/i })).toBeInTheDocument();
  });

  it('el botón "Generar PDF" dispara la mutación tRPC al hacer click', async () => {
    render(<ReportesPage />);
    const user = userEvent.setup();

    const btn = screen.getByRole('button', { name: /generar pdf/i });
    await user.click(btn);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledOnce();
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ tipo: expect.any(String) }),
      );
    });
  });

  it('muestra skeleton mientras carga el historial', () => {
    mockListQuery.mockReturnValue({ data: undefined, isLoading: true, isSuccess: false });
    render(<ReportesPage />);
    const skeletons = document.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('muestra mensaje vacío cuando no hay reportes', () => {
    render(<ReportesPage />);
    expect(screen.getByText(/aún no hay reportes generados/i)).toBeInTheDocument();
  });

  it('muestra badge "Listo" para reportes completados', () => {
    mockListQuery.mockReturnValue({
      data: [
        {
          id: 'rep-1',
          nombreArchivo: 'egresados-carrera-123.pdf',
          tipo: 'egresados_carrera',
          estado: 'COMPLETADO',
          createdAt: new Date().toISOString(),
          urlArchivo: '/reports/rep-1.pdf',
        },
      ],
      isLoading: false,
      isSuccess: true,
    });
    render(<ReportesPage />);
    expect(screen.getByText('Listo')).toBeInTheDocument();
  });

  it('muestra badge "Fallido" para reportes con error', () => {
    mockListQuery.mockReturnValue({
      data: [
        {
          id: 'rep-2',
          nombreArchivo: 'reporte-fallido.pdf',
          tipo: 'demanda_laboral',
          estado: 'FALLIDO',
          createdAt: new Date().toISOString(),
          urlArchivo: null,
        },
      ],
      isLoading: false,
      isSuccess: true,
    });
    render(<ReportesPage />);
    expect(screen.getByText('Fallido')).toBeInTheDocument();
  });

  it('el botón de descarga está deshabilitado para reportes no completados', () => {
    mockListQuery.mockReturnValue({
      data: [
        {
          id: 'rep-3',
          nombreArchivo: 'pendiente.pdf',
          tipo: 'empleabilidad_resumen',
          estado: 'PENDIENTE',
          createdAt: new Date().toISOString(),
          urlArchivo: null,
        },
      ],
      isLoading: false,
      isSuccess: true,
    });
    render(<ReportesPage />);
    const downloadBtn = screen.getByRole('button', { name: /descargar/i });
    expect(downloadBtn).toBeDisabled();
  });
});
