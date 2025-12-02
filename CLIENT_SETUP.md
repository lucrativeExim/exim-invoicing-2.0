# Client Setup Guide

This guide will help you set up and run the React frontend for the EXIM Invoicing System.

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Installation Steps

1. **Navigate to the client directory:**
   ```bash
   cd client
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm start
   ```

   The app will automatically open in your browser at `http://localhost:3000`

## Running Both Backend and Frontend

From the root directory, you can run both servers concurrently:

```bash
npm run dev:all
```

This will start:
- Backend server on `http://localhost:3000`
- Frontend development server on `http://localhost:3001` (or next available port)

## First Login

To log in, you'll need a user account in the database. If you don't have one:

1. **Create a user via API** (using curl or Postman):
   ```bash
   curl -X POST http://localhost:3000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "admin@example.com",
       "password": "password123",
       "first_name": "Admin",
       "last_name": "User",
       "user_role": "Admin"
     }'
   ```

2. **Or create directly in MySQL:**
   ```sql
   INSERT INTO users (email, password, first_name, last_name, user_role, status)
   VALUES ('admin@example.com', '$2a$10$hashedpassword', 'Admin', 'User', 'Admin', 'Active');
   ```

   Note: You'll need to hash the password using bcrypt. Use the registration endpoint instead.

## Environment Variables

Create a `.env` file in the `client` directory if you need to customize the API URL:

```env
REACT_APP_API_URL=http://localhost:3000/api
```

## Troubleshooting

### Port Already in Use

If port 3000 is already in use, React will automatically use the next available port (3001, 3002, etc.).

### CORS Issues

Make sure the backend server has CORS enabled (already configured in `server.js`).

### API Connection Issues

1. Ensure the backend server is running
2. Check that the API URL in `.env` matches your backend server
3. Verify CORS settings in the backend

## Building for Production

```bash
cd client
npm run build
```

This creates an optimized production build in the `build` folder.



