import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { listOrders } from '../api.js';

export default function Orders() {
  const { token } = useAuth();
  const location = useLocation();
  const justCreatedId = location.state?.justCreated;

  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  useEffect(() => {
    listOrders(token)
      .then((data) => { setOrders(data); setStatus('ready'); })
      .catch((err) => { setError(err.message); setStatus('error'); });
  }, [token]);

  if (status === 'loading') return <div className="state state--loading">Chargement…</div>;
  if (status === 'error') return <div className="state state--error">Erreur : {error}</div>;

  return (
    <section className="orders-page">
      <span className="eyebrow">Historique</span>
      <h1 className="display display--md">Vos <em>commandes.</em></h1>

      {justCreatedId && (
        <div className="flash flash--success">
          ✓ Commande <strong>#{String(justCreatedId).padStart(4, '0')}</strong> enregistrée avec succès.
        </div>
      )}

      {orders.length === 0 ? (
        <>
          <p className="lede">Aucune commande pour le moment.</p>
          <Link to="/" className="link-back">← Voir le catalogue</Link>
        </>
      ) : (
        <ul className="orders-list">
          {orders.map((order) => (
            <li
              key={order.id}
              className={'order-card' + (order.id === justCreatedId ? ' order-card--new' : '')}
            >
              <header className="order-header">
                <div>
                  <span className="order-id">Commande #{String(order.id).padStart(4, '0')}</span>
                  <span className="order-date">
                    {new Date(order.createdAt).toLocaleString('fr-FR', {
                      dateStyle: 'long', timeStyle: 'short'
                    })}
                  </span>
                </div>
                <span className={`order-status order-status--${order.status.toLowerCase()}`}>
                  {order.status === 'CONFIRMED' ? 'Confirmée' : order.status}
                </span>
              </header>

              <ul className="order-items">
                {order.items.map((it) => (
                  <li key={it.productId} className="order-item">
                    <div className={`order-thumb visual--${it.productId}`}>
                      <span className="visual-index">{String(it.productId).padStart(2, '0')}</span>
                    </div>
                    <span className="order-item-name">{it.name}</span>
                    <span className="order-item-qty">× {it.quantity}</span>
                    <span className="order-item-total">{it.lineTotal.toFixed(2)} €</span>
                  </li>
                ))}
              </ul>

              <footer className="order-footer">
                <span>Total</span>
                <span className="summary-price">{order.total.toFixed(2)} €</span>
              </footer>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
