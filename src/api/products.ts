import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { getStore, setStore } from './mockStore';
import type { Product, ProductInput } from '../types';

function mapRow(row: any): Product {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    size: row.size,
    color: row.color,
    sku: row.sku,
    costPrice: row.cost_price,
    sellPrice: row.sell_price,
    stock: row.stock,
    minStock: row.min_stock,
    photoUrl: row.photo_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listProducts(): Promise<Product[]> {
  if (!isSupabaseConfigured) {
    return [...getStore().products].sort((a, b) => a.name.localeCompare(b.name));
  }
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function getProduct(id: number): Promise<Product | null> {
  if (!isSupabaseConfigured) {
    return getStore().products.find((p) => p.id === id) ?? null;
  }
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data) : null;
}

export async function listLowStock(): Promise<Product[]> {
  if (!isSupabaseConfigured) {
    return getStore()
      .products.filter((p) => p.stock <= p.minStock)
      .sort((a, b) => a.stock - b.stock);
  }
  // PostgREST no compara dos columnas entre sí en el builder, así que
  // se trae todo (el catálogo de una tienda es chico) y se filtra aquí.
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('stock', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapRow).filter((p) => p.stock <= p.minStock);
}

export async function listCategories(): Promise<string[]> {
  if (!isSupabaseConfigured) {
    const unique = Array.from(new Set(getStore().products.map((p) => p.category)));
    return unique.sort((a, b) => a.localeCompare(b));
  }
  const { data, error } = await supabase.from('products').select('category');
  if (error) throw error;
  const unique = Array.from(new Set((data ?? []).map((r) => r.category as string)));
  return unique.sort((a, b) => a.localeCompare(b));
}

export async function createProduct(input: ProductInput): Promise<number> {
  if (!isSupabaseConfigured) {
    const store = getStore();
    const now = new Date().toISOString();
    const id = store.nextProductId++;
    store.products.push({
      id,
      name: input.name.trim(),
      category: input.category.trim() || 'General',
      size: input.size?.trim() || null,
      color: input.color?.trim() || null,
      sku: input.sku?.trim() || null,
      costPrice: input.costPrice,
      sellPrice: input.sellPrice,
      stock: input.stock,
      minStock: input.minStock,
      photoUrl: input.photoUrl,
      createdAt: now,
      updatedAt: now,
    });
    setStore(store);
    return id;
  }

  const { data, error } = await supabase
    .from('products')
    .insert({
      name: input.name.trim(),
      category: input.category.trim() || 'General',
      size: input.size?.trim() || null,
      color: input.color?.trim() || null,
      sku: input.sku?.trim() || null,
      cost_price: input.costPrice,
      sell_price: input.sellPrice,
      stock: input.stock,
      min_stock: input.minStock,
      photo_url: input.photoUrl,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function updateProduct(id: number, input: ProductInput): Promise<void> {
  if (!isSupabaseConfigured) {
    const store = getStore();
    const product = store.products.find((p) => p.id === id);
    if (!product) throw new Error('Producto no encontrado.');
    Object.assign(product, {
      name: input.name.trim(),
      category: input.category.trim() || 'General',
      size: input.size?.trim() || null,
      color: input.color?.trim() || null,
      sku: input.sku?.trim() || null,
      costPrice: input.costPrice,
      sellPrice: input.sellPrice,
      stock: input.stock,
      minStock: input.minStock,
      photoUrl: input.photoUrl,
      updatedAt: new Date().toISOString(),
    });
    setStore(store);
    return;
  }

  const { error } = await supabase
    .from('products')
    .update({
      name: input.name.trim(),
      category: input.category.trim() || 'General',
      size: input.size?.trim() || null,
      color: input.color?.trim() || null,
      sku: input.sku?.trim() || null,
      cost_price: input.costPrice,
      sell_price: input.sellPrice,
      stock: input.stock,
      min_stock: input.minStock,
      photo_url: input.photoUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteProduct(id: number): Promise<void> {
  if (!isSupabaseConfigured) {
    const store = getStore();
    store.products = store.products.filter((p) => p.id !== id);
    setStore(store);
    return;
  }
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
}

function readFileAsDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

const MAX_PHOTO_DIMENSION = 1000;
const PHOTO_QUALITY = 0.8;

/**
 * Redimensiona y comprime una foto a JPEG antes de subirla, para no
 * llenar el almacenamiento con fotos de cámara sin optimizar (varios MB
 * cada una). Deja el lado más largo en máximo 1000px a calidad 80%,
 * que normalmente pesa 100-300 KB en vez de 3-6 MB.
 */
async function compressImage(file: File): Promise<Blob> {
  const dataUrl = await readFileAsDataUrl(file);
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    img.src = dataUrl;
  });

  const scale = Math.min(1, MAX_PHOTO_DIMENSION / Math.max(img.width, img.height));
  const width = Math.round(img.width * scale);
  const height = Math.round(img.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', PHOTO_QUALITY)
  );
  return blob ?? file;
}

/**
 * Sube una foto de producto y devuelve la URL para guardar en
 * `ProductInput.photoUrl`. En modo real usa Supabase Storage (bucket
 * público `product-photos`); en modo mock la guarda como data-URL.
 * En ambos casos la foto se comprime primero (ver `compressImage`).
 */
export async function uploadProductPhoto(file: File): Promise<string> {
  const compressed = await compressImage(file);

  if (!isSupabaseConfigured) {
    return readFileAsDataUrl(compressed);
  }

  const path = `${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from('product-photos').upload(path, compressed, {
    upsert: true,
    contentType: 'image/jpeg',
  });
  if (error) throw error;

  const { data } = supabase.storage.from('product-photos').getPublicUrl(path);
  return data.publicUrl;
}
