import React from 'react';
import './StorePages.css';

const About = () => (
  <div className="content-page">
    <div className="content-shell">
      <section className="content-hero">
        <div>
          <div className="content-kicker">About HealthFuel</div>
          <h1 className="content-title">Built for people who take training, recovery, and long-term health seriously.</h1>
          <p className="content-lead">
            HealthFuel Store was created to make supplement shopping simpler, cleaner, and more trustworthy.
            We focus on formulas that support real performance goals, daily consistency, and informed choices,
            not hype-driven marketing.
          </p>
        </div>
        <div className="content-hero-media">
          <img
            src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80"
            alt="Athlete training in a gym"
          />
        </div>
      </section>

      <div className="content-stats">
        <div className="content-stat">
          <strong>Quality First</strong>
          <span>We highlight clean ingredient profiles and practical product information.</span>
        </div>
        <div className="content-stat">
          <strong>Goal Driven</strong>
          <span>Protein, recovery, endurance, and wellness products organized around real needs.</span>
        </div>
        <div className="content-stat">
          <strong>Customer Focused</strong>
          <span>A simple shopping flow, transparent pricing, and support that respects your time.</span>
        </div>
      </div>

      <div className="content-grid-2">
        <article className="content-card">
          <h2>What We Believe</h2>
          <p>
            Supplements should support training discipline, sleep, nutrition, and recovery, not replace them.
            That is why we position our store around education, practical use cases, and product clarity.
          </p>
          <ul className="content-list">
            <li>Use supplements to fill gaps, not to cover poor habits.</li>
            <li>Pick products according to your training goal and recovery capacity.</li>
            <li>Stay consistent with dosage, hydration, and meal timing.</li>
          </ul>
        </article>

        <article className="content-card">
          <h2>Why Customers Use HealthFuel</h2>
          <p>
            Our store is designed for people who want a fast, clean buying experience and product selections that
            make sense for gym performance, strength progression, and overall wellness.
          </p>
          <ul className="content-list">
            <li>Simple browsing and checkout flow</li>
            <li>Useful product categories and highlights</li>
            <li>Order history and account support for repeat buyers</li>
          </ul>
        </article>
      </div>
    </div>
  </div>
);

export default About;
