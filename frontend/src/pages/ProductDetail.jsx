import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { fetchProduct } from '../api.js';
import { useCart } from '../context/CartContext.jsx';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();

  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [justAdded, setJustAdded] = useState(false);

  useEffect(() => {
    setStatus('loading');
    fetchProduct(id)
      .then((data) => { setProduct(data); setStatus('ready'); })
      .catch((err) => { setError(err.message); setStatus('error'); });
  }, [id]);

  function onAdd() {
    addItem(product, quantity);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1800);
  }

  function onBuyNow() {
    addItem(product, quantity);
    navigate('/cart');
  }

  if (status === 'loading') return <div className="state state--loading">Chargement du produit…</div>;
  if (status === 'error') {
    return (
      <div className="state state--error">
        Produit introuvable.
        <br /><small>{error}</small>
        <div style={{ marginTop: '1rem' }}>
          <Link to="/" className="link-back">← Retour au catalogue</Link>
        </div>
      </div>
    );
  }

  const outOfStock = product.stock <= 0;

  return (
    <section className="detail">
      <Link to="/" className="link-back">← Retour au catalogue</Link>

      <div className="detail-grid">
        <div className={`detail-visual visual--${product.id}`}>
          <span className="visual-index">{String(product.id).padStart(2, '0')}</span>
        </div>

        <div className="detail-info">
          <span className="eyebrow">Référence · {String(product.id).padStart(4, '0')}</span>
          <h1 className="display display--md">{product.name}</h1>
          <p className="lede">{product.description}</p>

          <div className="detail-meta">
            <div>
              <span className="meta-label">Prix</span>
              <span className="meta-value meta-value--big">{product.price.toFixed(2)} €</span>
            </div>
            <div>
              <span className="meta-label">Disponibilité</span>
              <span className="meta-value">
                {outOfStock ? 'Rupture' : `${product.stock} en stock`}
              </span>
            </div>
          </div>

          <div className="detail-actions">
            <div className="qty-selector">
              <span className="meta-label">Quantité</span>
              <div className="qty-controls">
                <button type="button" className="qty-btn" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>−</button>
                <span className="qty-value">{quantity}</span>
                <button type="button" className="qty-btn" onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}>+</button>
              </div>
            </div>

            <div className="detail-cta">
              <button
                type="button"
                className="btn-primary"
                onClick={onAdd}
                disabled={outOfStock}
              >
                {justAdded ? '✓ Ajouté au panier' : 'Ajouter au panier'}
              </button>

              <button
                type="button"
                className="btn-ghost"
                onClick={onBuyNow}
                disabled={outOfStock}
              >
                Acheter maintenant →
              </button>
            </div>
          </div>

        
        </div>
      </div>
    </section>
  );
}
