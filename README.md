# EXIM Invoicing System 2.0

Complete invoicing system with separate API and Web applications.

## Project Structure

```
exim-invoicing-2.0/
├── api/                    # Backend API (Express + Prisma)
│   ├── config/            # Database configuration
│   ├── routes/            # API routes
│   ├── prisma/            # Prisma schema
│   ├── migrations/        # Database migrations
│   ├── scripts/           # Utility scripts
│   ├── server.js          # Express server
│   ├── package.json       # Backend dependencies
│   └── .env               # Backend environment variables
│
├── web/                    # Frontend Web App (Next.js)
│   ├── src/
│   │   ├── app/           # Next.js app router pages
│   │   ├── components/    # React components
│   │   ├── context/      # React context providers
│   │   ├── services/      # API services
│   │   ├── models/        # Data models
│   │   └── pages/         # Page components
│   ├── package.json       # Frontend dependencies
│   └── .env.local         # Frontend environment variables
│
└── README.md
```

## Ports

- **API (Backend)**: Port 5002
- **Web (Frontend)**: Port 5001

## Quick Start

### 1. Backend Setup (API)

```bash
cd api
npm install
cp .env.example .env
# Edit .env with your database credentials
npm run prisma:g
npm run dev
```

Backend will run on `http://localhost:5002`

### 2. Frontend Setup (Web)

```bash
cd web
npm install
cp .env.example .env.local
# Edit .env.local if needed (defaults are fine)
npm run dev
```

Frontend will run on `http://localhost:5001`

## Environment Variables

### API (.env)
```env
PORT=5002
DATABASE_URL="mysql://user:password@localhost:3306/exim_invoicing"
DB_HOST=localhost
DB_USER=exim_user
DB_PASSWORD=your_password
DB_NAME=exim_invoicing
JWT_SECRET=your-secret-key
NODE_ENV=development
```

### Web (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:5002/api
PORT=5001
```

## Development

### Run Both Servers

**Terminal 1 - API:**
```bash
cd api
npm run dev
```

**Terminal 2 - Web:**
```bash
cd web
npm run dev
```

## Features

- ✅ **Backend**: Express.js with Prisma ORM
- ✅ **Frontend**: Next.js 15 with TypeScript
- ✅ **Authentication**: JWT-based auth
- ✅ **UI Components**: Bootstrap 5 + Tailwind CSS
- ✅ **Form Components**: Button, Input, Select (react-select)
- ✅ **Protected Routes**: Authentication required pages

## API Endpoints

- `GET /` - API welcome message
- `POST /api/auth/login` - User login
- `GET /api/auth/verify` - Verify JWT token
- `POST /api/auth/register` - Register new user
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (soft delete)

## Database

Uses MySQL/MariaDB with Prisma ORM. Run migrations:

```bash
cd api
npm run migrate
```

Or use Prisma migrations:

```bash
cd api
npm run prisma:migrate
```

## Creating First User

```bash
curl -X POST http://localhost:5002/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123",
    "first_name": "Admin",
    "last_name": "User",
    "user_role": "Admin"
  }'
```

Then log in at `http://localhost:5001/login`

## Tech Stack

### Backend
- Node.js + Express
- Prisma ORM
- MySQL/MariaDB
- JWT Authentication
- bcryptjs

### Frontend
- Next.js 15
- React 18
- TypeScript
- Bootstrap 5
- Tailwind CSS
- React Select
- Axios

## License

ISC
