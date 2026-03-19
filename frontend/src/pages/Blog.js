import React from 'react';
import './StorePages.css';

const Blog = () => (
  <div className="content-page">
    <div className="content-shell">
      <section className="content-hero">
        <div>
          <div className="content-kicker">HealthFuel Blog</div>
          <h1 className="content-title">How to use supplements without wasting money or hurting your progress</h1>
          <p className="content-lead">
            For lifters, athletes, and serious gym-goers, supplements can help, but only when they match your goal,
            training style, recovery habits, and nutrition basics.
          </p>
        </div>
        <div className="content-card blog-article">
          <div className="blog-meta">
            <span>Nutrition Education</span>
            <span>5 min read</span>
            <span>For gym-focused customers</span>
          </div>
          <p>
            A good supplement stack should solve a specific problem: protein intake, recovery, workout energy,
            or micronutrient support. If you buy products just because they are popular, the result is usually an
            expensive cabinet and inconsistent results.
          </p>
        </div>
      </section>

      <article className="content-card blog-article">
        <div className="blog-section">
          <h3>1. Start with food and training consistency</h3>
          <p>
            If your calories, protein intake, sleep, and weekly training structure are unstable, even the best
            supplement will not deliver the result you expect. Get the foundation right first.
          </p>
        </div>

        <div className="blog-section">
          <h3>2. Match the supplement to the goal</h3>
          <ul className="content-list">
            <li><strong>Protein powder:</strong> useful when you struggle to hit daily protein consistently.</li>
            <li><strong>Creatine:</strong> one of the most practical choices for strength and performance.</li>
            <li><strong>Pre-workout:</strong> helps with focus and energy, but should not replace sleep.</li>
            <li><strong>Recovery support:</strong> best used when training volume is high and hydration matters.</li>
          </ul>
        </div>

        <div className="blog-section">
          <h3>3. Read labels like an athlete, not a marketer</h3>
          <p>
            Check serving size, actual active ingredients, caffeine amount, and whether the product fits your
            schedule. A flashy label does not matter if the formulation or dosage is weak.
          </p>
        </div>

        <div className="blog-section">
          <h3>4. Avoid stacking too much at once</h3>
          <p>
            Introducing multiple products together makes it hard to judge what is helping and what is not. Add one
            product with a clear purpose, stay consistent, and track performance, recovery, and digestion.
          </p>
        </div>

        <div className="blog-highlight">
          Supplements work best when they support a disciplined plan. If your goal is muscle gain, fat loss, better
          recovery, or workout energy, choose fewer products with clearer purpose and use them consistently.
        </div>
      </article>
    </div>
  </div>
);

export default Blog;
