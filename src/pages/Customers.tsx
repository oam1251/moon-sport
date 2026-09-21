import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoPeopleOutline } from 'react-icons/io5';
import ScreenContainer from '../components/ScreenContainer';
import EmptyState from '../components/EmptyState';
import FAB from '../components/FAB';
import FormField from '../components/FormField';
import { listCustomers } from '../api/customers';
import type { Customer } from '../types';

export default function Customers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    listCustomers().then(setCustomers);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.phone ?? '').includes(q)
    );
  }, [customers, query]);

  return (
    <ScreenContainer>
      <div className="screen-header">
        <h1 className="title">Clientes</h1>
        <p className="subtitle">{customers.length} cliente(s)</p>
        <FormField
          label="Buscar"
          placeholder="Nombre o teléfono"
          value={query}
          onChange={setQuery}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={IoPeopleOutline}
          title={query ? 'Sin resultados' : 'Aún no tienes clientes'}
          message={
            query
              ? 'Prueba con otro nombre o teléfono.'
              : 'Toca el botón + para dar de alta tu primer cliente.'
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((c) => (
            <div
              key={c.id}
              className="item-card"
              onClick={() => navigate(`/ajustes/clientes/${c.id}`)}
            >
              <div className="item-card__info">
                <span className="item-card__name">{c.name}</span>
                {c.phone && <span className="item-card__meta">{c.phone}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <FAB ariaLabel="Agregar cliente" onClick={() => navigate('/ajustes/clientes/nuevo')} />
    </ScreenContainer>
  );
}
