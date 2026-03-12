# Products Store - E-Commerce Application

A full-stack e-commerce web application built with React.js, Node.js, Express, MongoDB, and Stripe.

## Features

- Product listing with images, names, and prices
- Shopping cart with quantity controls
- Slide-in cart panel
- Checkout with Stripe payment processing
- Order confirmation with details

## Prerequisites

1. **Node.js** (v14 or higher) - Installed
2. **MongoDB Atlas Account** - Free tier at https://www.mongodb.com/cloud/atlas
3. **Stripe Account** - Free test account at https://stripe.com

## Setup Instructions

### 1. MongoDB Atlas Setup (Free)

1. Go to https://www.mongodb.com/cloud/atlas and create a free account
2. Create a free cluster (AWS, Google Cloud, or Azure)
3. Create a database user (username/password)
4. Click "Connect" → "Connect your application"
5. Copy the connection string (looks like: mongodb+srv://...)
6. Replace `username`, `password` in the connection string

### 2. Stripe Setup (Free)

1. Go to https://dashboard.stripe.com and create account
2. Go to Developers → API Keys
3. Copy your **Publishable Key** (pk_test_...)
4. Copy your **Secret Key** (sk_test_...)
5. Replace keys in:
   - `backend/.env` - STRIPE_SECRET_KEY
   - `frontend/src/pages/Checkout.js` - STRIPE_PUBLISHABLE_KEY

### 3. Update Configuration Files

**backend/.env:**
```
MONGODB_URI=mongodb+srv://your_username:your_password@cluster.mongodb.net/canxida_store?retryWrites=true&w=majority
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
```

**frontend/src/pages/Checkout.js:**
```javascript
const STRIPE_PUBLISHABLE_KEY = 'pk_test_your_publishable_key';
```

### 4. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 5. Run the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm start
```
Server runs at http://localhost:5000

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```
App opens at http://localhost:3000

## Project Structure

```
products.com/
├── backend/
│   ├── server.js          # Express server with API routes
│   ├── package.json
│   └── .env               # MongoDB & Stripe config
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.js
│   │   │   └── CartPanel.js
│   │   ├── context/
│   │   │   └── CartContext.js
│   │   ├── pages/
│   │   │   ├── ProductList.js
│   │   │   ├── Checkout.js
│   │   │   ├── Checkout.css
│   │   │   └── OrderConfirmation.js
│   │   ├── App.js
│   │   ├── App.css
│   │   └── index.js
│   └── package.json
├── SPEC.md
└── README.md
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | Get all products |
| POST | `/api/create-payment-intent` | Create Stripe payment intent |
| POST | `/api/orders` | Create new order |
| GET | `/api/orders/:id` | Get order by ID |

## Usage

1. Open http://localhost:3000
2. Browse products on the homepage
3. Click "Add to Cart" on any product
4. Cart panel opens - adjust quantities or remove items
5. Click "Proceed to Checkout"
6. Enter card details (use Stripe test card: 4242 4242 4242 4242)
7. Click "Pay Now"
8. View order confirmation

## Test Card Numbers (Stripe)

Use these for testing:
- **Success:** 4242 4242 4242 4242
- **Decline:** 4000 0000 0000 0002
- **Extras:** 4242... (any future date, any CVC)

## License

MIT