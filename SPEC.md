# E-Commerce Web Application Specification

## 1. Project Overview

**Project Name:** HealthFuel Store
**Type:** Full-stack E-Commerce Web Application
**Core Functionality:** Online shopping platform with product browsing, shopping cart, Stripe payment processing, and order management
**Target Users:** Online shoppers looking to purchase products

## 2. Tech Stack

- **Frontend:** React.js 18, React Router v6, Context API for state management
- **Backend:** Node.js, Express.js
- **Database:** MongoDB with Mongoose ODM
- **Payment:** Stripe API (Stripe Elements for frontend, Stripe webhooks on backend)
- **Styling:** Custom CSS with modern design

## 3. UI/UX Specification

### Layout Structure
- **Header:** Fixed navigation with logo, nav links (Home, Products), Cart icon with item count
- **Pages:** Product Listing, Cart Panel, Checkout, Order Confirmation
- **Footer:** Simple footer with copyright

### Visual Design
- **Color Palette:**
  - Primary: #2D3436 (Dark charcoal)
  - Secondary: #6C5CE7 (Purple)
  - Accent: #00CEC9 (Teal)
  - Background: #F8F9FA (Light gray)
  - White: #FFFFFF
  - Text Primary: #2D3436
  - Text Secondary: #636E72
  - Success: #00B894
  - Error: #FF6B6B

- **Typography:**
  - Font Family: 'Poppins', sans-serif
  - Headings: 600 weight
  - Body: 400 weight
  - Sizes: H1: 2.5rem, H2: 2rem, H3: 1.5rem, Body: 1rem

- **Spacing:** 8px base unit (8, 16, 24, 32, 48)

- **Visual Effects:**
  - Card shadows: 0 4px 6px rgba(0,0,0,0.1)
  - Hover transitions: 0.3s ease
  - Button hover: scale(1.05)
  - Border radius: 8px for cards, 4px for buttons

### Components
- **ProductCard:** Image, name, price, Add to Cart button
- **CartItem:** Product info, quantity controls, remove button, subtotal
- **CartPanel:** Slide-in panel from right side
- **CheckoutForm:** Order summary, Stripe payment form
- **OrderConfirmation:** Success message, order details

## 4. Functionality Specification

### Product Listing (Home Page)
- Display products in grid layout (3 columns desktop, 2 tablet, 1 mobile)
- Each product shows: image, name, selling price
- "Add to Cart" button adds product to cart
- Cart icon shows badge with item count

### Cart
- Slide-in panel showing all cart items
- Each item: product image, name, quantity controls (+/-), unit price, subtotal
- Remove item button (X)
- Display total price at bottom
- "Proceed to Checkout" button
- Empty cart message when no items

### Checkout
- Order summary section showing all items and total
- Stripe Elements CardElement for card input
- Card number, expiry, CVV fields via Stripe
- "Pay Now" button with amount
- Loading state during payment processing

### Order Placement
- On successful Stripe payment, create order in MongoDB
- Show Order Confirmation page
- Display: Order ID, order items, total paid, date
- "Continue Shopping" button to return to products

### API Endpoints
- `GET /api/products` - Get all products
- `POST /api/orders` - Create new order (after payment)
- `POST /api/create-payment-intent` - Create Stripe payment intent

### Database Schema
**Product:**
- name: String
- image: String (URL)
- price: Number

**Order:**
- items: Array of {productId, name, price, quantity}
- total: Number
- stripePaymentId: String
- createdAt: Date

## 5. Acceptance Criteria

1. Products display correctly with images, names, prices
2. Add to Cart adds product and updates cart count
3. Cart panel opens/closes smoothly
4. Quantity can be increased/decreased in cart
5. Items can be removed from cart
6. Cart total calculates correctly
7. Checkout displays order summary
8. Stripe payment form accepts card input
9. Successful payment creates order and shows confirmation
10. Order confirmation displays order details
11. Responsive design works on mobile/tablet/desktop