import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchProducts } from '../api.js';

export default function Catalog() {
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProducts()
      .then((data) => { setProducts(data); setStatus('ready'); })
      .catch((err) => { setError(err.message); setStatus('error'); });
  }, []);

  return (
    <section className="catalog">
      <div className="catalog-hero">
        <span className="eyebrow">Collection · Printemps 2026</span>
        <h1 className="display">
          La maison <em>s'habille</em><br />pour les beaux jours.
        </h1>
        <p className="lede">
          Cinq pièces essentielles, sélectionnées avec soin.
          Livraison partout en France sous 48h ouvrées.
        </p>
      </div>

      {status === 'loading' && (
        <div className="state state--loading">Chargement du catalogue…</div>
      )}

      {status === 'error' && (
        <div className="state state--error">
          Impossible de contacter le <code>product-service</code>.
          <br />
          <small>Vérifie qu'il tourne sur <code>localhost:3000</code>. Détail : {error}</small>
        </div>
      )}

      {status === 'ready' && (
        <ul className="grid">
          {products.map((p, i) => (
            <li key={p.id} className={`card card--${p.id}`} style={{ '--i': i }}>
              <Link to={`/products/${p.id}`} className="card-link">
                <div className={`visual visual--${p.id}`}>
                  <span className="visual-index">{String(i + 1).padStart(2, '0')}</span>
                  <span className="visual-tag">{p.stock < 10 ? 'Stock limité' : 'Disponible'}</span>
                </div>
                <div className="card-body">
                  <h2 className="card-title">{p.name}</h2>
                  <p className="card-desc">{p.description}</p>
                  <div className="card-foot">
                    <span className="price">{p.price.toFixed(2)} €</span>
                    <span className="cta">Voir →</span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
