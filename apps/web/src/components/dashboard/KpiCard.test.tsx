import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { KpiCard } from './KpiCard';
import { TrendingUp } from 'lucide-react';

describe('KpiCard', () => {
  it('renderiza el título y el valor correctamente', () => {
    render(<KpiCard title="Total egresados" value={42} icon={TrendingUp} />);

    expect(screen.getByText('Total egresados')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renderiza el subtítulo cuando se proporciona', () => {
    render(
      <KpiCard
        title="Tasa empleabilidad"
        value="75%"
        subtitle="Egresados contratados"
        icon={TrendingUp}
      />,
    );

    expect(screen.getByText('Egresados contratados')).toBeInTheDocument();
  });

  it('muestra skeleton cuando loading=true', () => {
    const { container } = render(
      <KpiCard title="Cargando" value={0} icon={TrendingUp} loading />,
    );

    // Skeleton renders a div with animate-pulse class
    expect(container.querySelector('[class*="animate-pulse"]')).toBeInTheDocument();
    // Value should NOT be visible
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('no muestra skeleton cuando loading=false', () => {
    const { container } = render(
      <KpiCard title="Activo" value={99} icon={TrendingUp} loading={false} />,
    );

    expect(screen.getByText('99')).toBeInTheDocument();
    expect(container.querySelector('[class*="animate-pulse"]')).not.toBeInTheDocument();
  });

  it('renderiza el icono con aria-hidden', () => {
    const { container } = render(
      <KpiCard title="Test" value={1} icon={TrendingUp} />,
    );

    const icon = container.querySelector('[aria-hidden="true"]');
    expect(icon).toBeInTheDocument();
  });
});
