import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { createOrder } from '../api.js';

export default function Checkout() {
  const { items, totalPrice, clear } = useCart();
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function confirm() {
    if (items.length === 0) return;
    setError(null);
    setLoading(true);
    try {
      const order = await createOrder(
        items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        token
      );
      clear();
      navigate(`/orders`, { state: { justCreated: order.id } });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <section className="checkout-page">
        <span className="eyebrow">Commande</span>
        <h1 className="display display--md">Rien à valider.</h1>
        <p className="lede">Votre panier est vide.</p>
        <Link to="/" className="link-back">← Voir le catalogue</Link>
      </section>
    );
  }

  return (
    <section className="checkout-page">
      <Link to="/cart" className="link-back">← Retour au panier</Link>

      <span className="eyebrow">Finalisation</span>
      <h1 className="display display--md">Vérifiez votre <em>commande.</em></h1>
      <p className="lede">Bonjour <strong>{user.name}</strong>, voici le récapitulatif avant envoi à <code>order-service</code>.</p>

      <div className="checkout-grid">
        <div className="checkout-recap">
          <h2 className="summary-title">Articles</h2>
          <ul className="recap-lines">
            {items.map((item) => (
              <li key={item.productId} className="recap-line">
                <div className={`recap-thumb visual--${item.productId}`}>
                  <span className="visual-index">{String(item.productId).padStart(2, '0')}</span>
                </div>
                <div className="recap-info">
                  <span className="recap-name">{item.name}</span>
                  <span className="recap-qty">Quantité : {item.quantity}</span>
                </div>
                <div className="recap-total">
                  {(item.price * item.quantity).toFixed(2)} €
                </div>
              </li>
            ))}
          </ul>
        </div>

        <aside className="checkout-summary">
          <h2 className="summary-title">Paiement</h2>
          <div className="summary-row">
            <span>Articles ({items.length})</span>
            <span>{totalPrice.toFixed(2)} €</span>
          </div>
          <div className="summary-row summary-row--muted">
            <span>Livraison</span>
            <span>Offerte</span>
          </div>
          <div className="summary-row summary-row--total">
            <span>Total TTC</span>
            <span className="summary-price summary-price--big">{totalPrice.toFixed(2)} €</span>
          </div>

          {error && <div className="form-error">{error}</div>}

          <button type="button" className="btn-primary btn-primary--full" onClick={confirm} disabled={loading}>
            {loading ? 'Envoi en cours…' : 'Confirmer la commande'}
          </button>

          <p className="checkout-note">
            La validation passera par <code>order-service</code> qui vérifiera
            stock et prix auprès de <code>product-service</code> via gRPC.
          </p>
        </aside>
      </div>
    </section>
  );
}
