import React, { useState, useEffect, useMemo } from 'react';
import { useCart } from '../context/CartContext';

const CATEGORIES = ['All', 'Protein', 'Pre-Workout', 'Vitamins', 'Recovery'];

const getCategoryFromName = (name) => {
  const n = name.toLowerCase();
  if (n.includes('protein') || n.includes('whey') || n.includes('casein') || n.includes('mass')) return 'Protein';
  if (n.includes('pre') || n.includes('workout') || n.includes('energy') || n.includes('pump')) return 'Pre-Workout';
  if (n.includes('vitamin') || n.includes('omega') || n.includes('zinc') || n.includes('magnesium') || n.includes('fish oil') || n.includes('multivitamin')) return 'Vitamins';
  if (n.includes('recover') || n.includes('bcaa') || n.includes('glutamine') || n.includes('sleep') || n.includes('joint')) return 'Recovery';
  return 'Protein';
};

const BADGES = ['BEST SELLER', 'NEW', 'SALE', '', 'BEST SELLER', '', 'NEW'];
const MOCK_REVIEWS = [142, 384, 97, 516, 228, 73, 189, 301];

const StarRating = ({ reviews }) => (
  <div className="product-rating">
    <span className="stars">★★★★★</span>
    {reviews > 0 && <span className="review-count">({reviews.toLocaleString()})</span>}
  </div>
);

const ProductCard = ({ product, index, onAddToCart }) => {
  const [added, setAdded] = useState(false);
  const badge = BADGES[index % BADGES.length];
  const reviews = MOCK_REVIEWS[index % MOCK_REVIEWS.length];

  const handleAdd = () => {
    onAddToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <div className="product-card">
      <div className="product-image-container">
        <img src={product.image} alt={product.name} className="product-image" loading="lazy" />
        {badge && (
          <span className={`product-badge badge-${badge.toLowerCase().replace(' ', '')}`}>
            {badge}
          </span>
        )}
        <div className="product-quick-add">
          <button className="quick-add-btn" onClick={handleAdd}>Quick Add</button>
        </div>
      </div>

      <div className="product-info">
        <div className="product-category">{getCategoryFromName(product.name)}</div>
        <h3 className="product-name">{product.name}</h3>
        <StarRating reviews={reviews} />
        <div className="product-price-row">
          <span className="product-price">${product.price.toFixed(2)}</span>
        </div>
        <button
          className={`add-to-cart-btn${added ? ' added' : ''}`}
          onClick={handleAdd}
        >
          {added ? 'Added to Cart' : '+ Add to Cart'}
        </button>
      </div>
    </div>
  );
};

const Hero = () => (
  <section className="hero">
    <div className="hero-inner">
      <div className="hero-content">
        <h1>
          Fuel Your Best<br />
          <span className="accent">Performance</span> Every Day
        </h1>
        <p className="hero-subtitle">
          Premium supplements crafted for serious athletes. Science-backed formulas,
          lab-tested purity, and results you can feel from day one.
        </p>
        <div className="hero-cta-group">
          <button
            className="btn-primary"
            onClick={() => document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Shop Now →
          </button>
          <button className="btn-secondary">View Best Sellers</button>
        </div>
        <div className="hero-trust">
          {['Free shipping over $50', 'Secure payments', '4.9/5 star rating'].map(item => (
            <div key={item} className="hero-trust-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [sortBy, setSortBy] = useState('popular');
  const { addToCart } = useCart();

  useEffect(() => {
    fetch('http://localhost:5000/api/products')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch products');
        return res.json();
      })
      .then(data => { setProducts(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    if (activeCategory === 'All') return products;
    return products.filter(p => getCategoryFromName(p.name) === activeCategory);
  }, [products, activeCategory]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    if (sortBy === 'price-asc') arr.sort((a, b) => a.price - b.price);
    else if (sortBy === 'price-desc') arr.sort((a, b) => b.price - a.price);
    else if (sortBy === 'newest') arr.reverse();
    return arr;
  }, [filtered, sortBy]);

  return (
    <div>
      <Hero />

      <div className="product-list-page" id="products-section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Our Products</h2>
            <p className="section-subtitle">Science-backed supplements for every goal</p>
          </div>
        </div>

        <div className="filter-bar">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`filter-chip${activeCategory === cat ? ' active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
          <select
            className="sort-select"
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
          >
            <option value="popular">Most Popular</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="newest">Newest</option>
          </select>
        </div>

        {!loading && !error && (
          <p className="products-count">
            Showing {sorted.length} product{sorted.length !== 1 ? 's' : ''}
            {activeCategory !== 'All' && ` in ${activeCategory}`}
          </p>
        )}

        {loading && (
          <div className="loading">
            <div className="loading-spinner" />
            <span>Loading products...</span>
          </div>
        )}

        {error && <div className="error">⚠️ Error: {error}</div>}

        {!loading && !error && sorted.length === 0 && (
          <div className="loading">
            <span>No products found in "{activeCategory}"</span>
          </div>
        )}

        {!loading && !error && sorted.length > 0 && (
          <div className="products-grid">
            {sorted.map((product, index) => (
              <ProductCard
                key={product._id}
                product={product}
                index={index}
                onAddToCart={addToCart}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductList;