# product-service

Microservice catalogue (Node.js + Express).
Endpoints REST publics — pas besoin d'authentification pour consulter les produits.

## Endpoints

| Méthode | Route            | Description              |
| ------- | ---------------- | ------------------------ |
| GET     | `/health`        | Health check (probes k8s)|
| GET     | `/products`      | Liste des produits       |
| GET     | `/products/:id`  | Détail d'un produit      |

---

## 1. Lancer en local (sans Docker)

```bash
npm install
npm start
# dans un autre terminal :
curl http://localhost:3000/products
curl http://localhost:3000/products/1
```

## 2. Construire l'image Docker

Remplace `TON_USER` par ton pseudo Docker Hub (ex. `alice42`).

```bash
docker build -t TON_USER/product-service:v1 .
docker run --rm -p 3000:3000 TON_USER/product-service:v1
curl http://localhost:3000/products
```

## 3. Publier sur Docker Hub

```bash
docker login
docker push TON_USER/product-service:v1
```

## 4. Déployer sur Kubernetes (minikube)

```bash
# Édite k8s/deployment.yaml et remplace TON_USER_DOCKERHUB par ton pseudo
minikube start
kubectl apply -f k8s/
kubectl get pods       # attends que les 2 pods soient Running
kubectl get svc

# Accéder au service depuis la machine hôte
kubectl port-forward svc/product-service 3000:3000
curl http://localhost:3000/products
```

---

## Prochaines étapes

- **12/20** : ajouter une gateway Ingress (ou Istio) qui expose `/products` publiquement
- **14/20** : ajouter `auth-service` + `order-service`, relier via gRPC
- **16/20** : brancher MySQL/PostgreSQL
- **18/20** : RBAC Kubernetes + mTLS Istio
- **20/20** : déploiement GKE/EKS + front React
