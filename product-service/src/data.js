// Catalogue produits en mémoire.
// Sera remplacé par MySQL/PostgreSQL au palier 16/20.
const products = [
  { id: 1, name: "T-shirt noir",       price: 19.99, stock: 42, description: "Coton bio" },
  { id: 2, name: "Sneakers blanches",  price: 79.99, stock: 15, description: "Modèle running" },
  { id: 3, name: "Casquette",          price: 14.50, stock: 30, description: "Ajustable" },
  { id: 4, name: "Sweat à capuche",    price: 49.00, stock:  8, description: "Gris chiné" },
  { id: 5, name: "Sac à dos",          price: 34.90, stock: 20, description: "20L imperméable" }
];

module.exports = { products };
