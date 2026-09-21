import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoClose, IoCubeOutline } from 'react-icons/io5';
import ScreenContainer from '../components/ScreenContainer';
import FormField from '../components/FormField';
import PrimaryButton from '../components/PrimaryButton';
import EmptyState from '../components/EmptyState';
import { listProducts } from '../api/products';
import { registerPurchase } from '../api/purchases';
import { formatCurrency, parseIntInput, parseNumericInput } from '../utils/format';
import type { Product, PurchaseLine } from '../types';

interface DraftLine {
  product: Product;
  qtyText: string;
  unitCostText: string;
}

export default function NewPurchase() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [supplier, setSupplier] = useState('');
  const [note, setNote] = useState('');
  const [updateCost, setUpdateCost] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listProducts().then(setProducts);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, query]);

  const addLine = (product: Product) => {
    if (lines.some((l) => l.product.id === product.id)) return;
    setLines((prev) => [
      ...prev,
      { product, qtyText: '1', unitCostText: String(product.costPrice) },
    ]);
  };

  const removeLine = (productId: number) => {
    setLines((prev) => prev.filter((l) => l.product.id !== productId));
  };

  const updateLine = (productId: number, patch: Partial<DraftLine>) => {
    setLines((prev) => prev.map((l) => (l.product.id === productId ? { ...l, ...patch } : l)));
  };

  const total = lines.reduce(
    (s, l) => s + parseNumericInput(l.unitCostText) * parseIntInput(l.qtyText),
    0
  );

  const handleSubmit = async () => {
    if (lines.length === 0) {
      setError('Agrega al menos un producto.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const purchaseLines: PurchaseLine[] = lines.map((l) => ({
        product: l.product,
        qty: parseIntInput(l.qtyText),
        unitCost: parseNumericInput(l.unitCostText),
      }));
      await registerPurchase({ lines: purchaseLines, supplier, note, updateCost });
      navigate('/inventario/compras');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer>
      <div className="screen-header">
        <h1 className="title">Nueva compra</h1>
        <FormField
          label="Proveedor (opcional)"
          value={supplier}
          onChange={setSupplier}
          placeholder="Nombre del proveedor"
        />
        <FormField
          label="Buscar producto para agregar"
          placeholder="Escribe el nombre del producto"
          value={query}
          onChange={setQuery}
        />
      </div>

      {lines.length > 0 && (
        <div className="list-card">
          {lines.map((line) => (
            <div key={line.product.id} className="form-row" style={{ alignItems: 'flex-end' }}>
              <div style={{ flex: 2 }}>
                <span className="item-card__name">{line.product.name}</span>
              </div>
              <div style={{ flex: 1 }}>
                <FormField
                  label="Cantidad"
                  type="number"
                  value={line.qtyText}
                  onChange={(v) => updateLine(line.product.id, { qtyText: v })}
                />
              </div>
              <div style={{ flex: 1 }}>
                <FormField
                  label="Costo unitario"
                  type="number"
                  value={line.unitCostText}
                  onChange={(v) => updateLine(line.product.id, { unitCostText: v })}
                />
              </div>
              <button
                type="button"
                className="stepper-btn"
                style={{ marginBottom: 12 }}
                onClick={() => removeLine(line.product.id)}
                aria-label="Quitar"
              >
                <IoClose />
              </button>
            </div>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState icon={IoCubeOutline} title="No hay productos" message="Da de alta productos desde Inventario primero." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
          {filtered
            .filter((p) => !lines.some((l) => l.product.id === p.id))
            .map((product) => (
              <div key={product.id} className="item-card" onClick={() => addLine(product)}>
                <div className="item-card__info">
                  <span className="item-card__name">{product.name}</span>
                  <span className="item-card__meta">
                    Costo actual: {formatCurrency(product.costPrice)} · stock: {product.stock}
                  </span>
                </div>
              </div>
            ))}
        </div>
      )}

      {lines.length > 0 && (
        <div className="cart-footer">
          <div className="cart-footer__row">
            <span className="cart-footer__label">Costo total de la compra</span>
            <span className="cart-footer__total">{formatCurrency(total)}</span>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <input
              type="checkbox"
              checked={updateCost}
              onChange={(e) => setUpdateCost(e.target.checked)}
            />
            Actualizar el costo de estos productos al de esta compra
          </label>
          <FormField label="Nota (opcional)" value={note} onChange={setNote} />
          {error && <p className="error-text">{error}</p>}
          <PrimaryButton label="Registrar compra" onClick={handleSubmit} loading={saving} />
        </div>
      )}
    </ScreenContainer>
  );
}
