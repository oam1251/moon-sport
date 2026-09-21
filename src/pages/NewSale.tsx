import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { IoRemove, IoAdd, IoSearchOutline } from 'react-icons/io5';
import ScreenContainer from '../components/ScreenContainer';
import FormField from '../components/FormField';
import PrimaryButton from '../components/PrimaryButton';
import ChoiceChips from '../components/ChoiceChips';
import EmptyState from '../components/EmptyState';
import { listProducts } from '../api/products';
import { registerSale } from '../api/sales';
import { createLayaway } from '../api/layaways';
import { listCustomers } from '../api/customers';
import { PAYMENT_METHODS, type Customer, type PaymentMethod, type Product } from '../types';
import { formatCurrency } from '../utils/format';

type Mode = 'venta' | 'apartado';

export default function NewSale() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<Mode>(searchParams.get('apartado') ? 'apartado' : 'venta');

  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState<Record<number, number>>({});
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PAYMENT_METHODS[0]);
  const [customerId, setCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [depositText, setDepositText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listProducts().then(setProducts);
    listCustomers().then(setCustomers);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, query]);

  const cartLines = useMemo(
    () =>
      Object.entries(cart)
        .filter(([, qty]) => qty > 0)
        .map(([productId, qty]) => {
          const product = products.find((p) => p.id === Number(productId));
          return product ? { product, qty } : null;
        })
        .filter((l): l is { product: Product; qty: number } => l !== null),
    [cart, products]
  );

  const total = cartLines.reduce((s, l) => s + l.product.sellPrice * l.qty, 0);
  const profit = cartLines.reduce(
    (s, l) => s + (l.product.sellPrice - l.product.costPrice) * l.qty,
    0
  );
  const itemCount = cartLines.reduce((s, l) => s + l.qty, 0);

  const changeQty = (product: Product, delta: number) => {
    setCart((prev) => {
      const current = prev[product.id] ?? 0;
      const next = Math.max(0, Math.min(product.stock, current + delta));
      return { ...prev, [product.id]: next };
    });
  };

  const selectedCustomer = customers.find((c) => c.id === Number(customerId));
  const effectiveCustomerName = selectedCustomer?.name || customerName.trim() || null;

  const handleConfirm = async () => {
    if (cartLines.length === 0) {
      setError('Agrega al menos un producto.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      if (mode === 'apartado') {
        await createLayaway({
          lines: cartLines,
          customerId: selectedCustomer?.id ?? null,
          customerName: effectiveCustomerName,
          deposit: depositText ? Number(depositText.replace(/,/g, '.')) || 0 : 0,
          paymentMethod,
        });
        navigate('/ventas/apartados');
        return;
      }

      await registerSale({
        lines: cartLines,
        paymentMethod,
        customerId: selectedCustomer?.id ?? null,
        customerName: effectiveCustomerName,
      });
      navigate('/ventas');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer>
      <div className="screen-header">
        <h1 className="title">{mode === 'venta' ? 'Nueva venta' : 'Nuevo apartado'}</h1>
        <ChoiceChips
          options={['venta', 'apartado'] as Mode[]}
          value={mode}
          onChange={setMode}
          labels={{ venta: 'Venta', apartado: 'Apartado' }}
        />
        <FormField
          label="Buscar producto"
          placeholder="Escribe el nombre del producto"
          value={query}
          onChange={setQuery}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={IoSearchOutline}
          title="No hay productos"
          message="Agrega productos desde la pestaña Inventario primero."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((product) => (
            <ProductPickRow
              key={product.id}
              product={product}
              qty={cart[product.id] ?? 0}
              onChange={(delta) => changeQty(product, delta)}
            />
          ))}
        </div>
      )}

      {cartLines.length > 0 && (
        <div className="cart-footer">
          <div className="cart-footer__row">
            <span className="cart-footer__label">
              {itemCount} artículo(s) · ganancia {formatCurrency(profit)}
            </span>
            <span className="cart-footer__total">{formatCurrency(total)}</span>
          </div>

          <div className="form-field">
            <label>Cliente existente (opcional)</label>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Sin cliente registrado</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          {!customerId && (
            <FormField
              label="O escribe un nombre de cliente (opcional)"
              value={customerName}
              onChange={setCustomerName}
            />
          )}

          {mode === 'apartado' && (
            <FormField
              label="Depósito inicial (opcional)"
              type="number"
              value={depositText}
              onChange={setDepositText}
            />
          )}

          <ChoiceChips options={PAYMENT_METHODS} value={paymentMethod} onChange={setPaymentMethod} />
          {error && <p className="error-text">{error}</p>}
          <PrimaryButton
            label={mode === 'venta' ? 'Registrar venta' : 'Crear apartado'}
            onClick={handleConfirm}
            loading={saving}
          />
        </div>
      )}
    </ScreenContainer>
  );
}

function ProductPickRow({
  product,
  qty,
  onChange,
}: {
  product: Product;
  qty: number;
  onChange: (delta: number) => void;
}) {
  const outOfStock = product.stock <= 0;
  return (
    <div className={`item-card ${outOfStock ? 'item-card--disabled' : ''}`}>
      {product.photoUrl && (
        <img src={product.photoUrl} alt="" className="item-card__thumb" />
      )}
      <div className="item-card__info">
        <span className="item-card__name">{product.name}</span>
        <span className="item-card__meta">
          {formatCurrency(product.sellPrice)} · disponibles: {product.stock}
        </span>
      </div>
      <div className="stepper">
        <button
          type="button"
          className="stepper-btn"
          disabled={qty <= 0}
          onClick={() => onChange(-1)}
        >
          <IoRemove />
        </button>
        <span className="stepper-value">{qty}</span>
        <button
          type="button"
          className="stepper-btn add"
          disabled={outOfStock || qty >= product.stock}
          onClick={() => onChange(1)}
        >
          <IoAdd />
        </button>
      </div>
    </div>
  );
}
