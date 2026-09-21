import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IoCashOutline,
  IoTrendingUpOutline,
  IoWalletOutline,
  IoBagCheckOutline,
  IoAddCircleOutline,
  IoPricetagOutline,
  IoTimeOutline,
  IoAlertCircle,
} from 'react-icons/io5';
import ScreenContainer from '../components/ScreenContainer';
import StatCard from '../components/StatCard';
import { formatCurrency } from '../utils/format';
import { getPeriodSummary } from '../api/reports';
import { listLowStock } from '../api/products';
import { getBusinessSettings } from '../api/settings';
import type { BusinessSettings, PeriodSummary, Product } from '../types';

const EMPTY_SUMMARY: PeriodSummary = {
  revenue: 0,
  cost: 0,
  grossProfit: 0,
  salesCount: 0,
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [today, setToday] = useState<PeriodSummary>(EMPTY_SUMMARY);
  const [month, setMonth] = useState<PeriodSummary>(EMPTY_SUMMARY);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [settings, setSettings] = useState<BusinessSettings>({ monthlyGoal: 0 });

  const load = useCallback(async () => {
    const [todaySummary, monthSummary, low, businessSettings] = await Promise.all([
      getPeriodSummary('today'),
      getPeriodSummary('month'),
      listLowStock(),
      getBusinessSettings(),
    ]);
    setToday(todaySummary);
    setMonth(monthSummary);
    setLowStock(low);
    setSettings(businessSettings);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const goalPct =
    settings.monthlyGoal > 0
      ? Math.min(100, Math.round((month.revenue / settings.monthlyGoal) * 100))
      : 0;

  return (
    <ScreenContainer>
      <div className="screen-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img
            src={`${import.meta.env.BASE_URL}icon.png`}
            alt="Moon Sport"
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              flexShrink: 0,
              filter: 'drop-shadow(var(--shadow-sm))',
            }}
          />
          <div>
            <p className="eyebrow" style={{ margin: 0 }}>
              Moon Sport
            </p>
            <h1 className="title" style={{ margin: 0 }}>
              Resumen de la tienda
            </h1>
          </div>
        </div>
      </div>

      <h2 className="section-label">Hoy</h2>
      <div className="grid">
        <StatCard
          label="Ventas"
          value={formatCurrency(today.revenue)}
          icon={IoCashOutline}
          tone="gold"
          helper={`${today.salesCount} venta(s)`}
        />
        <StatCard
          label="Ganancia"
          value={formatCurrency(today.grossProfit)}
          icon={IoTrendingUpOutline}
          tone={today.grossProfit >= 0 ? 'success' : 'danger'}
        />
      </div>

      <h2 className="section-label">Este mes</h2>
      <div className="grid">
        <StatCard label="Ingresos" value={formatCurrency(month.revenue)} icon={IoWalletOutline} tone="gold" />
        <StatCard
          label="Ganancia"
          value={formatCurrency(month.grossProfit)}
          icon={IoTrendingUpOutline}
          tone={month.grossProfit >= 0 ? 'success' : 'danger'}
        />
        <StatCard
          label="Ventas registradas"
          value={String(month.salesCount)}
          icon={IoBagCheckOutline}
          tone="neutral"
        />
      </div>

      {settings.monthlyGoal > 0 && (
        <>
          <h2 className="section-label">Meta del mes</h2>
          <div className="list-card">
            <div className="goal-bar">
              <div className="goal-bar__fill" style={{ width: `${goalPct}%` }} />
            </div>
            <span className="muted-text">
              {formatCurrency(month.revenue)} de {formatCurrency(settings.monthlyGoal)} ({goalPct}
              %)
            </span>
          </div>
        </>
      )}

      <h2 className="section-label">Acciones rápidas</h2>
      <div className="actions-row">
        <button className="action-card" onClick={() => navigate('/ventas/nueva')}>
          <IoAddCircleOutline />
          Nueva venta
        </button>
        <button className="action-card" onClick={() => navigate('/inventario/nuevo')}>
          <IoPricetagOutline />
          Nuevo producto
        </button>
        <button className="action-card" onClick={() => navigate('/ventas/apartados')}>
          <IoTimeOutline />
          Apartados
        </button>
      </div>

      {lowStock.length > 0 && (
        <>
          <h2 className="section-label">Stock bajo</h2>
          <div className="list-card">
            {lowStock.slice(0, 5).map((p) => (
              <div className="list-row" key={p.id}>
                <IoAlertCircle color="var(--danger)" size={16} />
                <span className="list-row__name">{p.name}</span>
                <span className="list-row__meta">
                  {p.stock} / mín. {p.minStock}
                </span>
              </div>
            ))}
            {lowStock.length > 5 && (
              <span className="muted-text">
                +{lowStock.length - 5} producto(s) más con stock bajo
              </span>
            )}
          </div>
        </>
      )}
    </ScreenContainer>
  );
}
