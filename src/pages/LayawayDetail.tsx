import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ScreenContainer from '../components/ScreenContainer';
import Badge from '../components/Badge';
import FormField from '../components/FormField';
import ChoiceChips from '../components/ChoiceChips';
import PrimaryButton from '../components/PrimaryButton';
import {
  addLayawayPayment,
  cancelLayaway,
  completeLayaway,
  getLayaway,
} from '../api/layaways';
import { formatCurrency, formatDateTime, parseNumericInput } from '../utils/format';
import { PAYMENT_METHODS, type Layaway, type PaymentMethod } from '../types';

const LABELS: Record<Layaway['status'], string> = {
  abierto: 'Abierto',
  completado: 'Completado',
  cancelado: 'Cancelado',
};
const TONES: Record<Layaway['status'], 'gold' | 'success' | 'danger'> = {
  abierto: 'gold',
  completado: 'success',
  cancelado: 'danger',
};

export default function LayawayDetail() {
  const { id } = useParams();
  const layawayId = Number(id);
  const navigate = useNavigate();

  const [layaway, setLayaway] = useState<Layaway | null>(null);
  const [amountText, setAmountText] = useState('');
  const [method, setMethod] = useState<PaymentMethod>(PAYMENT_METHODS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    getLayaway(layawayId).then(setLayaway);
  }, [layawayId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!layaway) {
    return (
      <ScreenContainer>
        <p className="muted-text">Cargando…</p>
      </ScreenContainer>
    );
  }

  const remaining = Math.max(0, layaway.total - layaway.deposit);
  const isOpen = layaway.status === 'abierto';

  const handleAddPayment = async () => {
    const amount = parseNumericInput(amountText);
    if (amount <= 0) {
      setError('El abono debe ser mayor a cero.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await addLayawayPayment(layaway.id, amount, method);
      setAmountText('');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    if (!confirm('¿Marcar como completado? Esto lo registra como una venta.')) return;
    setSaving(true);
    try {
      await completeLayaway(layaway.id);
      navigate('/ventas/apartados');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('¿Cancelar este apartado? El stock reservado se repone.')) return;
    setSaving(true);
    try {
      await cancelLayaway(layaway.id);
      navigate('/ventas/apartados');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer>
      <div className="screen-header">
        <h1 className="title">{layaway.customerName || 'Cliente sin registrar'}</h1>
        <p className="subtitle">{formatDateTime(layaway.date)}</p>
        <Badge label={LABELS[layaway.status]} tone={TONES[layaway.status]} />
      </div>

      <h2 className="section-label">Artículos</h2>
      <div className="list-card">
        {layaway.items.map((it) => (
          <div className="list-row" key={it.id}>
            <span className="list-row__name">
              {it.productName} × {it.qty}
            </span>
            <span className="muted-text">{formatCurrency(it.unitPrice * it.qty)}</span>
          </div>
        ))}
      </div>

      <h2 className="section-label">Pagos</h2>
      <div className="list-card">
        <div className="list-row">
          <span className="list-row__name">Total</span>
          <span className="muted-text">{formatCurrency(layaway.total)}</span>
        </div>
        <div className="list-row">
          <span className="list-row__name">Abonado</span>
          <span className="muted-text">{formatCurrency(layaway.deposit)}</span>
        </div>
        <div className="list-row">
          <span className="list-row__name">Falta</span>
          <span style={{ color: 'var(--gold)', fontWeight: 700 }}>
            {formatCurrency(remaining)}
          </span>
        </div>
        {layaway.payments.map((p) => (
          <div className="list-row" key={p.id}>
            <span className="muted-text">
              {formatDateTime(p.date)} · {p.method}
            </span>
            <span className="muted-text">{formatCurrency(p.amount)}</span>
          </div>
        ))}
      </div>

      {isOpen && (
        <>
          <h2 className="section-label">Registrar abono</h2>
          <FormField label="Monto" type="number" value={amountText} onChange={setAmountText} />
          <ChoiceChips options={PAYMENT_METHODS} value={method} onChange={setMethod} />
          {error && <p className="error-text">{error}</p>}
          <PrimaryButton
            label="Agregar abono"
            onClick={handleAddPayment}
            loading={saving}
          />

          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button
              className="btn-secondary"
              style={{ flex: 1 }}
              onClick={handleComplete}
              disabled={saving}
            >
              Marcar completado
            </button>
            <button
              className="btn-danger"
              style={{ flex: 1 }}
              onClick={handleCancel}
              disabled={saving}
            >
              Cancelar apartado
            </button>
          </div>
        </>
      )}
    </ScreenContainer>
  );
}
