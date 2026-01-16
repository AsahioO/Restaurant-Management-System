# 🍽️ Restaurant Management System

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js"/>
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React"/>
  <img src="https://img.shields.io/badge/PostgreSQL-14+-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL"/>
  <img src="https://img.shields.io/badge/Socket.IO-4.7-010101?style=for-the-badge&logo=socket.io&logoColor=white" alt="Socket.IO"/>
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="MIT License"/>
</p>

<p align="center">
  <strong>Open source restaurant management platform</strong><br>
  Real-time synchronization between inventory, menu, and orders
</p>

---

## ✨ Features

### 🔄 Real-Time Synchronization
- Dynamic menu availability based on inventory
- Instant order notifications via WebSocket
- Low stock alerts in real-time
- Automatic order status updates
- Connection indicator in the UI

### 📦 Inventory Management
- Ingredient control with configurable minimum stock
- Movement tracking (entries, exits, adjustments, waste)
- Automatic restock alerts
- Complete movement history with user and date
- Physical ingredient location tracking

### 🍽️ Menu Management
- Categories with custom icons (☕ Drinks, 🥐 Bakery, etc.)
- Dishes with multiple ingredients and required portions
- Automatic availability based on ingredient stock
- Visual indicator of remaining portions
- Customizable currency format

### 📝 Order System
- Quick creation with interactive cart
- Optional table selection
- Status flow: `pending` → `preparing` → `ready` → `delivered`
- Cancellation with automatic inventory restoration
- Notes per item and per order
- Automatic calculation of subtotal, tax, and total

### 📊 Analytics Dashboard (Manager Only)
- Real-time KPIs: daily sales, average ticket, active tables, alerts
- Hourly sales chart (bar)
- 14-day sales trend (line)
- Sales distribution by category (pie)
- Top 5 best-selling products
- Order breakdown by status

### 👥 User Management (Manager Only)
- Complete user CRUD
- Role assignment (Manager/Employee/Kitchen)
- Activity status control
- Password reset

### 🔔 Push Notifications (PWA)
- Background notifications when orders are ready
- Works even with app closed
- One-click subscription
- Per-user notification control

---

## 🛠️ Tech Stack

### Backend
- **Runtime:** Node.js 18+
- **Framework:** Express.js 4.x
- **Database:** PostgreSQL 14+
- **Real-time:** Socket.IO 4.x
- **Auth:** JWT with refresh tokens
- **Monitoring:** Sentry (optional)

### Frontend
- **Framework:** React 18 + Vite 5
- **Styling:** Tailwind CSS 3.x
- **Charts:** Recharts
- **Icons:** Lucide React
- **PWA:** vite-plugin-pwa

---

## 📋 Prerequisites

- Node.js 18 or higher
- PostgreSQL 14 or higher
- npm or yarn

---

## 🚀 Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/AsahioO/Restaurant-Management-System.git
cd Restaurant-Management-System
```

### 2. Install dependencies

```bash
npm run install:all
```

### 3. Configure environment

Copy the example environment file:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your database credentials:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=restaurant_db
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_super_secret_key
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your_refresh_secret
JWT_REFRESH_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:5173
```

### 4. Create database

```sql
CREATE DATABASE restaurant_db;
```

### 5. Run migrations and seed

```bash
cd backend
npm run db:migrate
npm run db:seed
```

> ⚠️ **Note:** If the seed fails with a `users_rol_check` constraint error, it means the database schema only supports `gerente` and `empleado` roles. The default migration uses these two roles. If you need additional roles (like `cocina`), you'll need to modify the migration file before running it.

### 6. Start development servers

```bash
# From root directory
npm run dev
```

Or start individually:

```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

### 7. Open in browser

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3000

---

## 👤 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Manager | admin@demo.com | password123 |
| Employee | employee@demo.com | password123 |
| Kitchen | kitchen@demo.com | password123 |

---

## 📁 Project Structure

```
restaurant-management-system/
├── backend/
│   ├── src/
│   │   ├── config/         # Configuration files
│   │   ├── controllers/    # Route controllers
│   │   ├── database/       # Migrations and seeds
│   │   ├── middleware/     # Express middleware
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── sockets/        # Socket.IO handlers
│   │   └── utils/          # Utility functions
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── contexts/       # React contexts
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   └── hooks/          # Custom hooks
│   └── package.json
└── package.json
```

---

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/refresh` | Refresh token |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/profile` | Get profile |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/orders` | List orders |
| POST | `/api/orders` | Create order |
| PATCH | `/api/orders/:id/status` | Update status |

### Menu
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/menu` | List menu items |
| POST | `/api/menu` | Create item (manager) |
| PUT | `/api/menu/:id` | Update item (manager) |

### Inventory
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/inventory` | List ingredients |
| POST | `/api/inventory/:id/adjust` | Adjust stock |

---

## 🌐 Deployment

### Environment Variables for Production

**Backend:**
```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=secure_random_string
CORS_ORIGIN=https://your-frontend-domain.com
SENTRY_DSN=https://xxx@sentry.io/xxx  # Optional
```

**Frontend:**
```env
VITE_API_URL=https://your-backend-domain.com/api
VITE_SOCKET_URL=https://your-backend-domain.com
```

### Deployment Platforms

The project includes configuration files for:
- **Railway** (`railway.json`)
- **Heroku** (`Procfile`)
- **Docker** (coming soon)

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Lucide Icons](https://lucide.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Socket.IO](https://socket.io/)
- [Recharts](https://recharts.org/)

---

<p align="center">
  Made with ❤️ by the open source community
</p>
