import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ScreenContainer from '../components/ScreenContainer';
import FormField from '../components/FormField';
import PrimaryButton from '../components/PrimaryButton';
import {
  createProduct,
  deleteProduct,
  getProduct,
  updateProduct,
  uploadProductPhoto,
} from '../api/products';
import { parseIntInput, parseNumericInput } from '../utils/format';
import type { ProductInput } from '../types';

const EMPTY: ProductInput = {
  name: '',
  category: '',
  size: '',
  color: '',
  sku: '',
  costPrice: 0,
  sellPrice: 0,
  stock: 0,
  minStock: 3,
  photoUrl: null,
};

export default function ProductForm() {
  const { id } = useParams();
  const productId = id ? Number(id) : null;
  const navigate = useNavigate();

  const [form, setForm] = useState<ProductInput>(EMPTY);
  const [costPriceText, setCostPriceText] = useState('0');
  const [sellPriceText, setSellPriceText] = useState('0');
  const [stockText, setStockText] = useState('0');
  const [minStockText, setMinStockText] = useState('3');
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!productId) return;
    getProduct(productId).then((product) => {
      if (!product) return;
      setForm(product);
      setCostPriceText(String(product.costPrice));
      setSellPriceText(String(product.sellPrice));
      setStockText(String(product.stock));
      setMinStockText(String(product.minStock));
    });
  }, [productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Ponle un nombre al producto.');
      return;
    }
    setError(null);
    setSaving(true);
    const input: ProductInput = {
      ...form,
      costPrice: parseNumericInput(costPriceText),
      sellPrice: parseNumericInput(sellPriceText),
      stock: parseIntInput(stockText),
      minStock: parseIntInput(minStockText),
    };
    try {
      if (productId) {
        await updateProduct(productId, input);
      } else {
        await createProduct(input);
      }
      navigate('/inventario');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    setError(null);
    try {
      const url = await uploadProductPhoto(file);
      setForm((prev) => ({ ...prev, photoUrl: url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDelete = async () => {
    if (!productId) return;
    if (!confirm('¿Borrar este producto? No se puede deshacer.')) return;
    await deleteProduct(productId);
    navigate('/inventario');
  };

  return (
    <ScreenContainer>
      <div className="screen-header">
        <h1 className="title">{productId ? 'Editar producto' : 'Nuevo producto'}</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label>Foto (opcional)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {form.photoUrl && (
              <img
                src={form.photoUrl}
                alt=""
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 12,
                  objectFit: 'cover',
                  border: '1px solid var(--border-soft)',
                }}
              />
            )}
            <input type="file" accept="image/*" onChange={handlePhotoChange} />
          </div>
          {uploadingPhoto && <span className="muted-text">Subiendo…</span>}
        </div>

        <FormField
          label="Nombre"
          value={form.name}
          onChange={(v) => setForm({ ...form, name: v })}
          placeholder="Ej. Playera Moon Sport"
          required
        />
        <div className="form-row">
          <FormField
            label="Categoría"
            value={form.category}
            onChange={(v) => setForm({ ...form, category: v })}
            placeholder="General"
          />
          <FormField
            label="SKU"
            value={form.sku ?? ''}
            onChange={(v) => setForm({ ...form, sku: v })}
          />
        </div>
        <div className="form-row">
          <FormField
            label="Talla"
            value={form.size ?? ''}
            onChange={(v) => setForm({ ...form, size: v })}
          />
          <FormField
            label="Color"
            value={form.color ?? ''}
            onChange={(v) => setForm({ ...form, color: v })}
          />
        </div>
        <div className="form-row">
          <FormField
            label="Costo"
            type="number"
            value={costPriceText}
            onChange={setCostPriceText}
          />
          <FormField
            label="Precio de venta"
            type="number"
            value={sellPriceText}
            onChange={setSellPriceText}
          />
        </div>
        <div className="form-row">
          <FormField label="Existencias" type="number" value={stockText} onChange={setStockText} />
          <FormField
            label="Mínimo de stock"
            type="number"
            value={minStockText}
            onChange={setMinStockText}
          />
        </div>

        {error && <p className="error-text">{error}</p>}

        <PrimaryButton label="Guardar" type="submit" loading={saving} />

        {productId && (
          <button
            type="button"
            className="btn-danger"
            style={{ width: '100%', marginTop: 12 }}
            onClick={handleDelete}
          >
            Eliminar producto
          </button>
        )}
      </form>
    </ScreenContainer>
  );
}
