# boutique-frontend

Interface React (Vite) pour la boutique — consomme `product-service` via REST.

## Structure

```
frontend/
├── src/
│   ├── pages/
│   │   ├── Catalog.jsx         liste des produits
│   │   └── ProductDetail.jsx   détail d'un produit
│   ├── api.js                  client HTTP vers les microservices
│   ├── App.jsx                 header + router + footer
│   ├── main.jsx                entry point
│   └── styles.css              styles (parti pris éditorial)
├── index.html
├── vite.config.js              proxy /api → localhost:3000
├── Dockerfile                  build + nginx
└── nginx.conf                  SPA fallback + proxy /api
```

## 1. Lancer en local

**Prérequis** : product-service doit tourner sur `localhost:3000`
(ouvre un terminal séparé : `cd product-service && npm start`)

```bash
cd frontend
npm install
npm run dev
```

Ouvre http://localhost:5173 — tu vois le catalogue.

## 2. Construire le bundle de prod

```bash
npm run build
npm run preview   # sert le build sur localhost:4173 pour tester
```

## 3. Dockeriser

```bash
docker build -t TON_USER/boutique-frontend:v1 .
docker run --rm -p 8080:80 TON_USER/boutique-frontend:v1
# ⚠️ Le proxy nginx pointe vers "product-service:3000" (nom DNS k8s),
# donc en local hors k8s les appels /api échoueront. Normal.
# En local, utilise `npm run dev`.
```

## 4. Publier + déployer

```bash
docker push TON_USER/boutique-frontend:v1

# Édite k8s/deployment.yaml pour remplacer TON_USER_DOCKERHUB
kubectl apply -f k8s/

# Accès via minikube
minikube service frontend
```
