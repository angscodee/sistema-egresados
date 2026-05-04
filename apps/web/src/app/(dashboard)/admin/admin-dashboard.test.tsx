/**
 * Tests for AdminDashboardPage
 * - Shows skeletons while loading
 * - Shows KPI values when data arrives
 * - Shows tabs for chart navigation
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────
const { mockUseQuery } = vi.hoisted(() => {
  const mockUseQuery = vi.fn();
  return { mockUseQuery };
});

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="recharts-container">{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => <svg>{children}</svg>,
  BarChart: ({ children }: { children: React.ReactNode }) => <svg>{children}</svg>,
  PieChart: ({ children }: { children: React.ReactNode }) => <svg>{children}</svg>,
  Line: () => null,
  Bar: () => null,
  Pie: () => null,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ user: { id: 'admin-1', email: 'admin@test.com', role: 'ADMIN' } }),
}));

vi.mock('@/lib/trpc/client', () => ({
  trpc: {
    estadisticas: {
      adminDashboard: { useQuery: mockUseQuery },
    },
  },
}));

import AdminDashboardPage from './page';

// ── Data fixtures ─────────────────────────────────────────────────────────────
const emptyData = {
  kpis: { totalEgresados: 0, totalEmpresas: 0, ofertasActivas: 0, tasaEmpleabilidad: 0 },
  graficas: {
    ofertasVsPostulacionesMensual: [],
    egresadosPorCarrera: [],
    topHabilidadesDemandadas: [],
    tasaContratacionPorCohorte: [],
  },
};

const filledData = {
  kpis: { totalEgresados: 42, totalEmpresas: 7, ofertasActivas: 15, tasaEmpleabilidad: 33.5 },
  graficas: {
    ofertasVsPostulacionesMensual: [{ mes: 'Ene 2026', ofertas: 3, postulaciones: 10 }],
    egresadosPorCarrera: [{ carrera: 'Sistemas', total: 20 }],
    topHabilidadesDemandadas: [{ habilidadId: '1', nombre: 'React', tipo: 'TECNICA', demanda: 8 }],
    tasaContratacionPorCohorte: [
      { anioEgreso: 2023, totalEgresados: 10, contratados: 4, tasa: 40 },
    ],
  },
};

describe('AdminDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra skeletons mientras los datos están cargando', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: false,
      refetch: vi.fn(),
    });

    render(<AdminDashboardPage />);

    const skeletons = document.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('muestra los valores de KPIs cuando los datos llegan', async () => {
    mockUseQuery.mockReturnValue({
      data: filledData,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    render(<AdminDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('7')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument();
      expect(screen.getByText('33.5%')).toBeInTheDocument();
    });
  });

  it('renderiza las 4 tabs de gráficas', () => {
    mockUseQuery.mockReturnValue({
      data: emptyData,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    render(<AdminDashboardPage />);

    expect(screen.getByRole('tab', { name: /tendencia mensual/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /por carrera/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /habilidades/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /cohortes/i })).toBeInTheDocument();
  });

  it('cambia de tab al hacer click', async () => {
    mockUseQuery.mockReturnValue({
      data: emptyData,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    render(<AdminDashboardPage />);
    const user = userEvent.setup();

    const tabCarreras = screen.getByRole('tab', { name: /por carrera/i });
    await user.click(tabCarreras);

    expect(tabCarreras).toHaveAttribute('data-state', 'active');
  });

  it('la tab "Tendencia mensual" está activa por defecto', () => {
    mockUseQuery.mockReturnValue({
      data: emptyData,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    render(<AdminDashboardPage />);

    const tabTendencia = screen.getByRole('tab', { name: /tendencia mensual/i });
    expect(tabTendencia).toHaveAttribute('data-state', 'active');
  });
});
