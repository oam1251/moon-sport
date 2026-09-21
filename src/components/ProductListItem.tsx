import type { Product } from '../types';
import { formatCurrency } from '../utils/format';
import Badge from './Badge';

export default function ProductListItem({
  product,
  onClick,
}: {
  product: Product;
  onClick: () => void;
}) {
  const lowStock = product.stock <= product.minStock;
  return (
    <div className="item-card" onClick={onClick}>
      {product.photoUrl && <img src={product.photoUrl} alt="" className="item-card__thumb" />}
      <div className="item-card__info">
        <span className="item-card__name">{product.name}</span>
        <span className="item-card__meta">
          {product.category}
          {product.size ? ` · ${product.size}` : ''}
          {product.color ? ` · ${product.color}` : ''} ·{' '}
          {formatCurrency(product.sellPrice)}
        </span>
      </div>
      <Badge
        label={`${product.stock} en stock`}
        tone={lowStock ? 'danger' : 'neutral'}
      />
    </div>
  );
}
