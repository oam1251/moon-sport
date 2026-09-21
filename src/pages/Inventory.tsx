import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoShirtOutline } from 'react-icons/io5';
import ScreenContainer from '../components/ScreenContainer';
import ProductListItem from '../components/ProductListItem';
import EmptyState from '../components/EmptyState';
import FAB from '../components/FAB';
import FormField from '../components/FormField';
import { listProducts } from '../api/products';
import { formatCurrency } from '../utils/format';
import type { Product } from '../types';

export default function Inventory() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    listProducts().then(setProducts);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.sku ?? '').toLowerCase().includes(q)
    );
  }, [products, query]);

  const totalUnits = products.reduce((s, p) => s + p.stock, 0);
  const inventoryValue = products.reduce((s, p) => s + p.stock * p.costPrice, 0);

  return (
    <ScreenContainer>
      <div className="screen-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 className="title">Inventario</h1>
          <button className="btn-secondary" onClick={() => navigate('/inventario/compras')}>
            Compras
          </button>
        </div>
        <p className="subtitle">
          {products.length} producto(s) · {totalUnits} unidad(es) · valor{' '}
          {formatCurrency(inventoryValue)}
        </p>
        <FormField
          label="Buscar"
          placeholder="Nombre, categoría o SKU"
          value={query}
          onChange={setQuery}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={IoShirtOutline}
          title={query ? 'Sin resultados' : 'Aún no tienes productos'}
          message={
            query
              ? 'Prueba con otro nombre, categoría o SKU.'
              : 'Toca el botón + para dar de alta tu primer producto.'
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((p) => (
            <ProductListItem
              key={p.id}
              product={p}
              onClick={() => navigate(`/inventario/${p.id}`)}
            />
          ))}
        </div>
      )}

      <FAB ariaLabel="Agregar producto" onClick={() => navigate('/inventario/nuevo')} />
    </ScreenContainer>
  );
}
