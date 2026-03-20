const bcrypt = require('bcryptjs');
const Product = require('../models/product.model');
const AdminUser = require('../models/adminUser.model');
const { ACTIVE_RECORD_FILTER } = require('../config/constants');

const seedProducts = async () => {
  const productCount = await Product.countDocuments(ACTIVE_RECORD_FILTER);
  if (productCount > 0) {
    return;
  }

  await Product.insertMany([
    { name: 'Whey Protein Isolate - 5lbs', image: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=400', price: 79.99, category: 'Protein', badge: 'BEST SELLER', description: 'Fast-absorbing isolate formula for lean muscle support.', stock: 40 },
    { name: 'Pre-Workout Energy - 30 Servings', image: 'https://images.unsplash.com/photo-1546483875-ad9014c88eba?w=400', price: 49.99, category: 'Pre-Workout', badge: 'NEW', description: 'Clean energy blend for focus and endurance.', stock: 32 },
    { name: 'Creatine Monohydrate - 60 Caps', image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400', price: 29.99, category: 'Performance', badge: 'SALE', description: 'Micronized creatine support for strength and power.', stock: 58 },
    { name: 'Multi-Vitamin Complex', image: 'https://images.unsplash.com/photo-1550572017-edd951b55104?w=400', price: 34.99, category: 'Vitamins', description: 'Daily micronutrient support for active lifestyles.', stock: 44 },
    { name: 'BCAA Recovery - 40 Servings', image: 'https://images.unsplash.com/photo-1594381898411-846e7d193883?w=400', price: 39.99, category: 'Recovery', description: 'Essential amino acids to support recovery and hydration.', stock: 26 },
    { name: 'Casein Protein - 2lbs', image: 'https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?w=400', price: 54.99, category: 'Protein', description: 'Slow-digesting protein ideal for overnight recovery.', stock: 18 },
    { name: 'L-Glutamine - 60 Servings', image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400', price: 27.99, category: 'Recovery', description: 'Recovery-focused glutamine formula for intense training.', stock: 50 },
    { name: 'Fish Oil Omega-3 - 90 Caps', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', price: 24.99, category: 'Vitamins', description: 'Omega-3 softgels for heart, joint, and brain support.', stock: 70 },
    { name: 'Beta-Alanine - 60 Caps', image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400', price: 22.99, category: 'Performance', description: 'Buffers fatigue and helps extend training output.', stock: 28 },
    { name: 'Mass Gainer - 6lbs', image: 'https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?w=400', price: 69.99, category: 'Protein', description: 'High-calorie formula for mass and strength goals.', stock: 20 },
    { name: 'ZMA Sleep Support', image: 'https://images.unsplash.com/photo-1599946347371-68eb71b16afc?w=400', price: 26.99, category: 'Recovery', description: 'Nighttime mineral blend to support rest and recovery.', stock: 34 },
    { name: 'Vegan Protein - 2lbs', image: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=400', price: 44.99, category: 'Protein', description: 'Plant-based protein blend with smooth texture and taste.', stock: 24 }
  ]);
  console.log('Products seeded successfully');
};

const seedAdminUser = async () => {
  const adminCount = await AdminUser.countDocuments(ACTIVE_RECORD_FILTER);
  if (adminCount > 0) {
    return;
  }

  const email = (process.env.ADMIN_EMAIL || 'admin@healthfuel.local').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'admin123456';

  await AdminUser.create({
    name: process.env.ADMIN_NAME || 'Admin',
    email,
    password: await bcrypt.hash(password, 10),
    role: 'admin'
  });

  console.log(`Default admin created: ${email}`);
};

module.exports = {
  seedProducts,
  seedAdminUser
};
