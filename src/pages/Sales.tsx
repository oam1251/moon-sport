import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoCartOutline } from 'react-icons/io5';
import ScreenContainer from '../components/ScreenContainer';
import EmptyState from '../components/EmptyState';
import FAB from '../components/FAB';
import Badge from '../components/Badge';
import { listSales, deleteSale } from '../api/sales';
import { formatCurrency, formatDateTime } from '../utils/format';
import type { Sale } from '../types';

export default function Sales() {
  const navigate = useNavigate();
  const [sales, setSales] = useState<Sale[]>([]);

  const load = () => listSales().then(setSales);

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (sale: Sale) => {
    if (!confirm('¿Borrar esta venta? El stock de sus productos se repone.')) return;
    await deleteSale(sale.id);
    load();
  };

  return (
    <ScreenContainer>
      <div className="screen-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 className="title">Ventas</h1>
          <button className="btn-secondary" onClick={() => navigate('/ventas/apartados')}>
            Apartados
          </button>
        </div>
        <p className="subtitle">{sales.length} venta(s) registradas</p>
      </div>

      {sales.length === 0 ? (
        <EmptyState
          icon={IoCartOutline}
          title="Aún no hay ventas"
          message="Toca el botón + para registrar la primera."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sales.map((sale) => (
            <div key={sale.id} className="item-card">
              <div className="item-card__info">
                <span className="item-card__name">
                  {sale.items.length} artículo(s) · {sale.paymentMethod}
                </span>
                <span className="item-card__meta">{formatDateTime(sale.date)}</span>
              </div>
              <Badge label={formatCurrency(sale.total)} tone="gold" />
              <button
                type="button"
                className="btn-secondary"
                onClick={() => handleDelete(sale)}
                aria-label="Borrar venta"
              >
                Borrar
              </button>
            </div>
          ))}
        </div>
      )}

      <FAB ariaLabel="Nueva venta" onClick={() => navigate('/ventas/nueva')} />
    </ScreenContainer>
  );
}
