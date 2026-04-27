# Boutique en ligne — Architecture microservices

Projet école : boutique e-commerce basée sur **5 microservices Node.js**,
communication REST + gRPC, base PostgreSQL centralisée via un data-service dédié,
déployée sur Kubernetes avec Istio en gateway.

## Architecture

```
                           ┌─────────────┐
                           │   Frontend  │  React + Vite + nginx
                           │  (port 80)  │
                           └──────┬──────┘
                                  │
                          ┌───────▼────────┐
                          │  Istio Gateway │  point d'entrée unique
                          └──┬──┬──┬──┬────┘
                             │  │  │  │    REST /api/*
              ┌──────────────┘  │  │  └──────────────┐
              ▼                 ▼  ▼                 ▼
    ┌──────────────────┐  ┌─────────────┐  ┌──────────────────┐
    │  product-service │  │auth-service │  │  order-service   │
    │ REST  :3000      │  │REST  :3001  │  │ REST  :3002      │
    │ gRPC  :50051     │  └──────┬──────┘  └────────┬─────┬───┘
    │  (public)        │         │                  │     │
    └──────────┬───────┘         │ gRPC             │ gRPC│ gRPC
               │                 │ UserRepo         │Order│Check
               │                 │                  │Repo │Avail
               │                 ▼                  ▼     │
               │           ┌─────────────────────────┐    │
               │           │      data-service       │    │
               │           │       gRPC  :50052      │    │
               │           │  UserRepo + OrderRepo   │    │
               │           └───────────┬─────────────┘    │
               │                       │                  │
               │                       ▼                  │
               │                ┌─────────────┐           │
               │                │ PostgreSQL  │           │
               │                │   (PVC)     │           │
               │                └─────────────┘           │
               │                                          │
               └──────────────── gRPC ────────────────────┘
                   CheckAvailability / GetProduct
```

### Services

| Service           | Rôle                                                    | Ports              |
|-------------------|---------------------------------------------------------|--------------------|
| **product-service** | Catalogue (in-memory, statique)                       | 3000 REST + 50051 gRPC |
| **auth-service**    | Inscription/login, JWT + bcrypt                       | 3001 REST          |
| **order-service**   | Commandes, orchestre product + data                   | 3002 REST          |
| **data-service**    | Accès centralisé à PostgreSQL (Users + Orders)        | 50052 gRPC         |
| **frontend**        | React, consomme les 3 services REST via Istio         | 80                 |
| **postgres**        | Base de données                                       | 5432               |

### Communications

- **Frontend → REST** : Istio gateway route `/api/products|auth|orders` vers les bons services
- **auth-service → data-service** : gRPC (`UserRepository`)
- **order-service → data-service** : gRPC (`OrderRepository`)
- **order-service → product-service** : gRPC (`ProductService.CheckAvailability`)
- **data-service → Postgres** : pool pg standard

### Flux d'une commande

1. Visiteur non connecté → catalogue (product-service REST via Istio)
2. Ajoute au panier (localStorage front)
3. Checkout → redirection login si pas connecté
4. auth-service reçoit `{email, password}` → gRPC `FindUserByEmail` → data-service → Postgres
5. auth-service compare bcrypt + émet JWT (24h)
6. Frontend `POST /orders` avec Bearer token
7. order-service vérifie JWT → gRPC `CheckAvailability` → product-service (validation stock + prix)
8. order-service → gRPC `CreateOrder` → data-service → `BEGIN; INSERT orders; INSERT order_items; COMMIT;`
9. Confirmation retournée au front → visible dans "Mes commandes"

---

## Lancer en local (sans k8s)

Prérequis : **Node.js 20+**, **Docker** (pour Postgres).

**1. Démarrer Postgres dans un conteneur** :
```powershell
docker run --name boutique-postgres -e POSTGRES_USER=boutique_user -e POSTGRES_PASSWORD=boutique_pwd -e POSTGRES_DB=boutiquedb -p 5432:5432 -d postgres:16-alpine
```

**2. Ouvrir 5 terminaux** (un par service) :
```powershell
cd data-service    ; npm install ; npm start    # gRPC 50052
cd product-service ; npm install ; npm start    # REST 3000 + gRPC 50051
cd auth-service    ; npm install ; npm start    # REST 3001
cd order-service   ; npm install ; npm start    # REST 3002
cd frontend        ; npm install ; npm run dev  # 5173
```

**3. Ouvrir http://localhost:5173**

---

## Déployer sur Kubernetes (minikube + Istio)

```powershell
# 1. Cluster + Istio
minikube start --driver=docker --cpus=2 --memory=3072 --addons=none
istioctl install --set profile=demo -y
kubectl label namespace default istio-injection=enabled

# 2. Secret JWT (partagé auth/order)
kubectl create secret generic jwt-secret --from-literal=secret=mon-secret-jwt

# 3. Postgres (dans l'ordre : secret → pvc → deployment → service)
kubectl apply -f postgres/

# 4. Attendre que Postgres soit prêt (Running 2/2)
kubectl get pods -w -l app=postgres
# Ctrl+C quand prêt

# 5. Les microservices (ordre : data d'abord, car auth/order en dépendent)
kubectl apply -f data-service/k8s/
kubectl apply -f product-service/k8s/
kubectl apply -f auth-service/k8s/
kubectl apply -f order-service/k8s/
kubectl apply -f frontend/k8s/

# 6. Gateway Istio
kubectl apply -f istio/

# 7. Tunnel pour exposer la gateway (dans un autre terminal, à laisser ouvert)
minikube tunnel

# 8. Tester
kubectl get svc istio-ingressgateway -n istio-system  # note l'EXTERNAL-IP
curl http://127.0.0.1/api/products
# Puis ouvrir http://127.0.0.1 dans le navigateur
```

**⚠️ Avant tout build Docker**, remplace `TON_USER_DOCKERHUB` dans les 5 fichiers `*/k8s/deployment.yaml` par ton vrai pseudo.

---

## Build Docker

```powershell
docker login

docker build -t TON_USER/product-service:v2   ./product-service
docker build -t TON_USER/auth-service:v2      ./auth-service     # v2 : version gRPC
docker build -t TON_USER/order-service:v2     ./order-service    # v2 : version gRPC
docker build -t TON_USER/data-service:v1      ./data-service     # nouveau
docker build -t TON_USER/boutique-frontend:v2 ./frontend

docker push TON_USER/product-service:v2
docker push TON_USER/auth-service:v2
docker push TON_USER/order-service:v2
docker push TON_USER/data-service:v1
docker push TON_USER/boutique-frontend:v2
```

---

## Progression au barème

| Palier | État | Preuve                                                    |
|--------|------|-----------------------------------------------------------|
| 10/20  | ✅   | 1 service + Docker + k8s                                  |
| 12/20  | ✅   | Gateway Istio + VirtualService                            |
| 14/20  | ✅   | Multi-services + **gRPC bonus** (product↔order, data↔auth, data↔order) |
| 16/20  | ✅   | PostgreSQL via data-service (database-per-use-case)       |
| 18/20  | ⏳   | RBAC Kubernetes + mTLS Istio + HTTPS                      |
| 20/20  | ⏳   | Déploiement GKE/EKS                                        |

---

## Structure du dépôt

```
boutique/
├── product-service/     # Catalogue (REST + gRPC serveur)
├── auth-service/        # Auth (REST + gRPC client vers data)
├── order-service/       # Commandes (REST + gRPC clients product+data)
├── data-service/        # Accès Postgres (gRPC UserRepo + OrderRepo)
├── frontend/            # React
├── postgres/            # Manifests k8s Postgres (secret, pvc, deployment, service)
├── istio/               # gateway + virtualservice
└── README.md
```
