import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoTimeOutline } from 'react-icons/io5';
import ScreenContainer from '../components/ScreenContainer';
import EmptyState from '../components/EmptyState';
import FAB from '../components/FAB';
import Badge from '../components/Badge';
import ChoiceChips from '../components/ChoiceChips';
import { listLayaways } from '../api/layaways';
import { formatCurrency, formatDateTime } from '../utils/format';
import type { Layaway, LayawayStatus } from '../types';

const FILTERS: LayawayStatus[] = ['abierto', 'completado', 'cancelado'];
const LABELS: Record<LayawayStatus, string> = {
  abierto: 'Abiertos',
  completado: 'Completados',
  cancelado: 'Cancelados',
};
const TONES: Record<LayawayStatus, 'gold' | 'success' | 'danger'> = {
  abierto: 'gold',
  completado: 'success',
  cancelado: 'danger',
};

export default function Layaways() {
  const navigate = useNavigate();
  const [layaways, setLayaways] = useState<Layaway[]>([]);
  const [status, setStatus] = useState<LayawayStatus>('abierto');

  useEffect(() => {
    listLayaways().then(setLayaways);
  }, []);

  const filtered = useMemo(
    () => layaways.filter((l) => l.status === status),
    [layaways, status]
  );

  return (
    <ScreenContainer>
      <div className="screen-header">
        <h1 className="title">Apartados</h1>
        <ChoiceChips options={FILTERS} value={status} onChange={setStatus} labels={LABELS} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={IoTimeOutline}
          title={`Sin apartados ${LABELS[status].toLowerCase()}`}
          message="Los apartados se crean desde Ventas → Nueva venta, eligiendo modo Apartado."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((l) => (
            <div
              key={l.id}
              className="item-card"
              onClick={() => navigate(`/ventas/apartados/${l.id}`)}
            >
              <div className="item-card__info">
                <span className="item-card__name">{l.customerName || 'Cliente sin registrar'}</span>
                <span className="item-card__meta">
                  {l.items.length} artículo(s) · {formatDateTime(l.date)} · abonado{' '}
                  {formatCurrency(l.deposit)} de {formatCurrency(l.total)}
                </span>
              </div>
              <Badge label={LABELS[l.status]} tone={TONES[l.status]} />
            </div>
          ))}
        </div>
      )}

      <FAB ariaLabel="Nuevo apartado" onClick={() => navigate('/ventas/nueva?apartado=1')} />
    </ScreenContainer>
  );
}
