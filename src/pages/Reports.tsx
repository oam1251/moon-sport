import { useEffect, useState } from 'react';
import ScreenContainer from '../components/ScreenContainer';
import ChoiceChips from '../components/ChoiceChips';
import StatCard from '../components/StatCard';
import PrimaryButton from '../components/PrimaryButton';
import { IoWalletOutline, IoPricetagOutline, IoTrendingUpOutline } from 'react-icons/io5';
import { getPeriodSummary, getTopProducts } from '../api/reports';
import { downloadPdf } from '../api/backups';
import { formatCurrency } from '../utils/format';
import type { PeriodKey, PeriodSummary, TopProduct } from '../types';

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'today', label: 'Hoy' },
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mes' },
];

const EMPTY_SUMMARY: PeriodSummary = {
  revenue: 0,
  cost: 0,
  grossProfit: 0,
  salesCount: 0,
};

export default function Reports() {
  const [period, setPeriod] = useState<PeriodKey>('month');
  const [summary, setSummary] = useState<PeriodSummary>(EMPTY_SUMMARY);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = async () => {
    setExportError(null);
    setExporting(true);
    try {
      await downloadPdf();
    } catch (err) {
      setExportError(err instanceof Error ? err.message : String(err));
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    Promise.all([getPeriodSummary(period), getTopProducts(period)]).then(
      ([s, top]) => {
        setSummary(s);
        setTopProducts(top);
      }
    );
  }, [period]);

  const periodLabel = PERIODS.find((p) => p.key === period)?.label ?? '';

  return (
    <ScreenContainer>
      <div className="screen-header">
        <h1 className="title">Reportes</h1>
        <ChoiceChips
          options={PERIODS.map((p) => p.key)}
          value={period}
          onChange={setPeriod}
          labels={Object.fromEntries(PERIODS.map((p) => [p.key, p.label])) as Record<PeriodKey, string>}
        />
      </div>

      <h2 className="section-label">Comparativo — {periodLabel}</h2>
      <div className="grid">
        <StatCard label="Ingresos" value={formatCurrency(summary.revenue)} icon={IoWalletOutline} tone="gold" />
        <StatCard
          label="Costo de mercancía"
          value={formatCurrency(summary.cost)}
          icon={IoPricetagOutline}
          tone="neutral"
        />
        <StatCard
          label="Ganancia"
          value={formatCurrency(summary.grossProfit)}
          icon={IoTrendingUpOutline}
          tone={summary.grossProfit >= 0 ? 'success' : 'danger'}
        />
      </div>

      <h2 className="section-label">Productos más vendidos</h2>
      {topProducts.length === 0 ? (
        <p className="muted-text">Sin ventas en este periodo.</p>
      ) : (
        <div className="list-card">
          {topProducts.map((p) => (
            <div className="list-row" key={p.productName}>
              <span className="list-row__name">
                {p.productName} · {p.qtySold} unidad(es)
              </span>
              <span style={{ color: 'var(--gold)', fontSize: 13, fontWeight: 600 }}>
                {formatCurrency(p.revenue)}
              </span>
            </div>
          ))}
        </div>
      )}

      <h2 className="section-label">Exportar</h2>
      {exportError && <p className="error-text">{exportError}</p>}
      <PrimaryButton label="Exportar a PDF" onClick={handleExport} loading={exporting} />
    </ScreenContainer>
  );
}
