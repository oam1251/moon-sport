import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ScreenContainer from '../components/ScreenContainer';
import FormField from '../components/FormField';
import PrimaryButton from '../components/PrimaryButton';
import { createCustomer, deleteCustomer, getCustomer, updateCustomer } from '../api/customers';
import type { CustomerInput } from '../types';

const EMPTY: CustomerInput = { name: '', phone: '', note: '' };

export default function CustomerForm() {
  const { id } = useParams();
  const customerId = id ? Number(id) : null;
  const navigate = useNavigate();

  const [form, setForm] = useState<CustomerInput>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!customerId) return;
    getCustomer(customerId).then((c) => {
      if (c) setForm(c);
    });
  }, [customerId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Ponle un nombre al cliente.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      if (customerId) {
        await updateCustomer(customerId, form);
      } else {
        await createCustomer(form);
      }
      navigate('/ajustes/clientes');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!customerId) return;
    if (!confirm('¿Borrar este cliente?')) return;
    await deleteCustomer(customerId);
    navigate('/ajustes/clientes');
  };

  return (
    <ScreenContainer>
      <div className="screen-header">
        <h1 className="title">{customerId ? 'Editar cliente' : 'Nuevo cliente'}</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <FormField
          label="Nombre"
          value={form.name}
          onChange={(v) => setForm({ ...form, name: v })}
          placeholder="Nombre completo"
          required
        />
        <FormField
          label="Teléfono (opcional)"
          value={form.phone ?? ''}
          onChange={(v) => setForm({ ...form, phone: v })}
          placeholder="10 dígitos"
        />
        <FormField
          label="Nota (opcional)"
          type="textarea"
          value={form.note ?? ''}
          onChange={(v) => setForm({ ...form, note: v })}
        />

        {error && <p className="error-text">{error}</p>}

        <PrimaryButton label="Guardar" type="submit" loading={saving} />

        {customerId && (
          <button
            type="button"
            className="btn-danger"
            style={{ width: '100%', marginTop: 12 }}
            onClick={handleDelete}
          >
            Eliminar cliente
          </button>
        )}
      </form>
    </ScreenContainer>
  );
}
