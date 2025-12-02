# EXIM Invoicing Web Application

Next.js React application with Bootstrap for the EXIM Invoicing System.

## Features

- ✅ Next.js 15 with JavaScript (no TypeScript)
- ✅ Bootstrap 5 for styling
- ✅ Form components in `components/formComponents`
- ✅ Login page integrated with authentication API
- ✅ Dashboard page with user information
- ✅ JWT token-based authentication

## Project Structure

```
web/
├── src/
│   ├── app/
│   │   ├── layout.js          # Root layout with Bootstrap CSS
│   │   ├── globals.css         # Global styles
│   │   ├── page.js             # Home page (redirects to login)
│   │   ├── login/
│   │   │   └── page.js         # Login page
│   │   └── dashboard/
│   │       └── page.js         # Dashboard page
│   ├── components/
│   │   ├── formComponents/     # Form components
│   │   │   ├── Input.js
│   │   │   ├── Button.js
│   │   │   ├── Alert.js
│   │   │   └── index.js
│   │   └── index.js
│   └── services/
│       ├── api.js              # Axios API configuration
│       └── authService.js      # Authentication service
├── package.json
├── next.config.js
└── jsconfig.json               # Path aliases configuration
```

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   Create `.env.local` file (already created):
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:6001/api
   ```

3. **Run development server:**
   ```bash
   npm run dev
   ```

   The application will run on `http://localhost:5001`

## API Integration

The application connects to the backend API running on port 6001 (or as configured in `.env.local`).

### Authentication Endpoints Used:
- `POST /api/auth/login` - User login
- `GET /api/auth/verify` - Verify JWT token
- `POST /api/auth/register` - User registration (optional)

## Components

### Form Components (`components/formComponents`)

- **Input**: Text input with label, validation, and error display
- **Button**: Bootstrap-styled button with variants and sizes
- **Alert**: Bootstrap alert component with dismissible option

### Usage Example:

```javascript
import { Input, Button, Alert } from '@/components/formComponents';

<Input
  label="Email"
  type="email"
  name="email"
  value={email}
  onChange={handleChange}
  error={errors.email}
  required
/>

<Button type="submit" variant="primary" disabled={loading}>
  Submit
</Button>

<Alert variant="danger" dismissible onClose={handleClose}>
  Error message
</Alert>
```

## Pages

### Login Page (`/login`)
- Email and password authentication
- Form validation
- Error handling
- Redirects to dashboard on success

### Dashboard Page (`/dashboard`)
- Protected route (requires authentication)
- Displays user information
- Logout functionality

## Authentication Flow

1. User enters email and password on login page
2. Form is validated client-side
3. API call to `/api/auth/login`
4. On success, JWT token is stored in localStorage
5. User is redirected to dashboard
6. Token is automatically included in subsequent API requests

## Development

- **Port**: 5001 (configurable in `package.json`)
- **Hot Reload**: Enabled in development mode
- **Path Aliases**: Use `@/` to import from `src/` directory

## Build for Production

```bash
npm run build
npm start
```



