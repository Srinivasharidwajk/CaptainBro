# Captain Bro 🍗

Hyper-local meat, food, and grocery quick-commerce mobile application built for Warangal & Telangana.

---

## 🏗️ Architecture & Project Structure

The project follows a clean, domain-driven structure under `src/`:

```
captain/
├── src/
│   ├── app/                # Expo Router screen routes
│   │   ├── _layout.tsx     # Root provider layout (Auth, Cart, Order, Admin, Rider)
│   │   ├── index.tsx       # Customer Home & Catalog Showcase
│   │   ├── admin/          # Admin Control Center (Dashboard)
│   │   ├── rider/          # Delivery Partner Console & Shift Tracking
│   │   ├── cart.tsx        # Customer Checkout & Bill Breakdown
│   │   ├── orders.tsx      # Customer Past Orders
│   │   ├── products.tsx    # Category Explorer & Search
│   │   └── ...
│   │
│   ├── components/         # Reusable UI components
│   │   ├── admin/          # Admin modular tabs (Orders, Products, Riders, Users)
│   │   ├── customer/       # Customer modular blocks (Banners, Categories, Reviews, Location)
│   │   └── BottomNavbar.tsx# Shared mobile navigation
│   │
│   ├── context/            # React state providers
│   │   ├── AuthContext.tsx
│   │   ├── CartContext.tsx
│   │   ├── OrderContext.tsx
│   │   ├── AdminContext.tsx
│   │   └── RiderContext.tsx
│   │
│   ├── firebase/           # Firebase SDK & Firestore CRUD operations
│   │   ├── auth.ts
│   │   ├── database.ts
│   │   └── firebaseConfig.ts
│   │
│   ├── services/           # Business logic & operational domain services
│   ├── types/              # Centralized domain TypeScript contracts
│   └── utils/              # Helper utilities, constants & recipes
│
├── assets/                 # Brand assets, icons & product catalog images
├── firestore.rules         # Hardened Firestore security rules
└── package.json            # Project dependencies & runtime scripts
```

---

## 🚀 Quick Start

### Install Dependencies
```bash
npm install
```

### Start Development Server
```bash
npx expo start
```

### Type Checking
```bash
npx tsc --noEmit
```
