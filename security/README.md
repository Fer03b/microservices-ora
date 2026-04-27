# Sécurité du cluster — Palier 18/20

Ce dossier contient la configuration de sécurité "defense in depth" : plusieurs
couches empilées, chacune couvrant un type d'attaque différent.

## Les 4 couches de sécurité

### 1. mTLS Istio (`peer-authentication.yaml`)

**Ce que ça protège** : l'espionnage et l'injection de trafic entre services.

Tous les échanges entre pods sont automatiquement chiffrés avec **TLS mutuel**.
Chaque sidecar Envoy présente un certificat signé par Istio, et refuse toute
connexion sans certificat valide.

**Mode STRICT** : un pod sans sidecar Istio ne peut pas du tout communiquer
avec les services. Aucun trafic en clair sur le réseau du cluster.

### 2. AuthorizationPolicies Istio (`authorization-policies.yaml`)

**Ce que ça protège** : les mouvements latéraux dans le cluster.

Règles explicites "qui peut appeler qui" basées sur l'**identité cryptographique**
(ServiceAccount) — pas sur l'adresse IP qui peut être usurpée.

Exemples concrets :
- `data-service` n'accepte QUE auth-service et order-service
- Un attaquant qui prendrait le contrôle de product-service ne pourrait pas
  lire les utilisateurs en appelant data-service
- `frontend` et `auth-service` ne sont joignables qu'via l'ingressgateway

### 3. RBAC Kubernetes (`service-accounts.yaml` + `rbac.yaml`)

**Ce que ça protège** : l'escalade de privilèges via l'API Kubernetes.

Chaque service a son propre ServiceAccount avec des droits **minimaux** :
- Par défaut : aucun droit sur l'API k8s
- Tous les microservices : peuvent lire les ConfigMaps du namespace
- `data-service` seulement : peut lire le Secret `postgres-credentials`

Si un attaquant compromet un pod, il ne peut pas :
- Lister les pods du cluster
- Lire les autres Secrets
- Créer de nouveaux pods
- Accéder à d'autres namespaces

### 4. NetworkPolicy (`network-policy.yaml`)

**Ce que ça protège** : le bypass du service mesh.

Pare-feu au niveau TCP/IP : seul `data-service` peut ouvrir une connexion
TCP vers Postgres sur le port 5432. Même si quelqu'un écrivait du code qui
bypasse Istio (connexion directe à l'IP du pod Postgres), le paquet serait
bloqué par le plan de données réseau.

⚠️ Nécessite un CNI compatible (Calico). Sur minikube :
```
minikube start --cni=calico
```

## Ordre d'application

```powershell
# 1. Les identités (doit venir AVANT les deployments qui y réfèrent)
kubectl apply -f security/service-accounts.yaml

# 2. Redéployer les services pour qu'ils utilisent leurs SA
kubectl apply -f product-service/k8s/
kubectl apply -f auth-service/k8s/
kubectl apply -f order-service/k8s/
kubectl apply -f data-service/k8s/
kubectl apply -f frontend/k8s/
kubectl apply -f postgres/

# 3. RBAC (droits API k8s)
kubectl apply -f security/rbac.yaml

# 4. mTLS + AuthorizationPolicies Istio
kubectl apply -f security/peer-authentication.yaml
kubectl apply -f security/authorization-policies.yaml

# 5. NetworkPolicy (si CNI compatible)
kubectl apply -f security/network-policy.yaml
```

## Vérifications

### mTLS actif ?
```powershell
# Les logs d'un sidecar Envoy doivent montrer "tls" sur les connexions
kubectl logs <pod> -c istio-proxy | Select-String "tls"
```

### AuthorizationPolicy actif ?
Fais un appel non autorisé, il doit être bloqué :
```powershell
# Depuis le sidecar de frontend, essayer d'appeler data-service directement
kubectl exec -it <pod-frontend> -c istio-proxy -- curl -v data-service:50052
# Tu dois voir "RBAC: access denied"
```

### ServiceAccounts en place ?
```powershell
kubectl get sa
kubectl describe pod <pod> | Select-String "Service Account"
```

## Pour le rapport

Screenshots utiles à faire après avoir tout appliqué :
1. `kubectl get peerauthentication` — preuve mTLS configuré
2. `kubectl get authorizationpolicy` — les 5 règles listées
3. `kubectl get serviceaccount` — les 6 SA
4. `kubectl get rolebinding` — les liaisons RBAC
5. Un `kubectl exec` qui prouve qu'un appel non autorisé est rejeté
