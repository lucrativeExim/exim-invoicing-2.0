# Setup Guide - EXIM Invoicing System 2.0

## Project Structure

```
exim-invoicing-2.0/
├── api/          # Backend API (Express + Prisma)
└── web/          # Frontend Web App (Next.js)
```

## Ports

- **API**: Port 5002 (http://localhost:5002)
- **Web**: Port 5001 (http://localhost:5001)

## Initial Setup

### 1. Backend API Setup

```bash
# Navigate to API directory
cd api

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your database credentials
# Update: DATABASE_URL, DB_USER, DB_PASSWORD, etc.

# Generate Prisma Client
npm run prisma:g

# Run database migrations (if needed)
npm run migrate
# OR use Prisma migrations
npm run prisma:migrate
```

### 2. Frontend Web Setup

```bash
# Navigate to Web directory
cd web

# Install dependencies
npm install

# Copy environment file (optional, defaults are fine)
cp .env.example .env.local

# Edit .env.local if needed
# NEXT_PUBLIC_API_URL=http://localhost:5002/api
```

## Running the Application

### Option 1: Run Separately (Recommended)

**Terminal 1 - Backend API:**
```bash
cd api
npm run dev
```

**Terminal 2 - Frontend Web:**
```bash
cd web
npm run dev
```

### Option 2: Run from Root (if you add scripts)

You can add scripts to root `package.json`:

```json
{
  "scripts": {
    "api:dev": "cd api && npm run dev",
    "web:dev": "cd web && npm run dev",
    "dev:all": "concurrently \"npm run api:dev\" \"npm run web:dev\""
  }
}
```

## Environment Variables

### API (.env in api/ directory)

```env
PORT=5002
DATABASE_URL="mysql://exim_user:password@localhost:3306/exim_invoicing"
DB_HOST=localhost
DB_USER=exim_user
DB_PASSWORD=your_password
DB_NAME=exim_invoicing
JWT_SECRET=your-secret-key-change-in-production
NODE_ENV=development
```

### Web (.env.local in web/ directory)

```env
NEXT_PUBLIC_API_URL=http://localhost:5002/api
PORT=5001
```

## Creating Your First User

After starting the API server:

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

## Access the Application

- **Backend API**: http://localhost:5002
- **Frontend Web**: http://localhost:5001
- **Login Page**: http://localhost:5001/login

## Troubleshooting

### Port Already in Use

```bash
# Kill process on port 5002
lsof -ti:5002 | xargs kill -9

# Kill process on port 5001
lsof -ti:5001 | xargs kill -9
```

### Database Connection Issues

1. Make sure MySQL/MariaDB is running
2. Verify database credentials in `api/.env`
3. Check database exists:
   ```bash
   mysql -u exim_user -p -e "SHOW DATABASES;"
   ```

### Prisma Client Not Generated

```bash
cd api
npm run prisma:g
```

### Next.js Build Issues

```bash
cd web
rm -rf .next node_modules
npm install
npm run dev
```

## Development Workflow

1. **Start Backend**: `cd api && npm run dev`
2. **Start Frontend**: `cd web && npm run dev`
3. **Make Changes**: Files auto-reload
4. **Access**: http://localhost:5001

## Production Build

### Backend
```bash
cd api
npm start
```

### Frontend
```bash
cd web
npm run build
npm start
```



