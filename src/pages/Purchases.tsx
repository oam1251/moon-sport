import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoCubeOutline } from 'react-icons/io5';
import ScreenContainer from '../components/ScreenContainer';
import EmptyState from '../components/EmptyState';
import FAB from '../components/FAB';
import Badge from '../components/Badge';
import { listPurchases } from '../api/purchases';
import { formatCurrency, formatDateTime } from '../utils/format';
import type { Purchase } from '../types';

export default function Purchases() {
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState<Purchase[]>([]);

  useEffect(() => {
    listPurchases().then(setPurchases);
  }, []);

  return (
    <ScreenContainer>
      <div className="screen-header">
        <h1 className="title">Compras</h1>
        <p className="subtitle">Entradas de mercancía registradas</p>
      </div>

      {purchases.length === 0 ? (
        <EmptyState
          icon={IoCubeOutline}
          title="Aún no hay compras"
          message="Toca el botón + para registrar la primera entrada de mercancía."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {purchases.map((purchase) => (
            <div key={purchase.id} className="item-card">
              <div className="item-card__info">
                <span className="item-card__name">
                  {purchase.supplier || 'Sin proveedor'} · {purchase.items.length} producto(s)
                </span>
                <span className="item-card__meta">{formatDateTime(purchase.date)}</span>
              </div>
              <Badge label={formatCurrency(purchase.totalCost)} tone="neutral" />
            </div>
          ))}
        </div>
      )}

      <FAB ariaLabel="Nueva compra" onClick={() => navigate('/inventario/compras/nueva')} />
    </ScreenContainer>
  );
}
