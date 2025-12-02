# 🎯 START HERE

## Project Restructured Successfully! ✅

Your project has been restructured with:
- ✅ **api/** - Backend (Port 5002)
- ✅ **web/** - Frontend Next.js (Port 5001)
- ✅ Safe ports (no Chrome warnings)
- ✅ Separate .env files in each directory
- ✅ Next.js 15 with TypeScript

## Quick Start

### 1. Backend Setup
```bash
cd api
npm install
cp .env.example .env
# Edit .env with your database credentials
npm run prisma:g
npm run dev
```

### 2. Frontend Setup
```bash
cd web
npm install
npm run dev
```

### 3. Access
- API: http://localhost:5002
- Web: http://localhost:5001

## Important Notes

⚠️ **Run servers from their respective directories:**
- Backend: `cd api && npm run dev`
- Frontend: `cd web && npm run dev`

⚠️ **Each directory has its own:**
- `package.json`
- `node_modules/`
- `.env` file

## Documentation

- `QUICK_START.md` - Quick setup guide
- `SETUP_GUIDE.md` - Detailed instructions
- `PROJECT_RESTRUCTURE.md` - What changed

## Need Help?

Check `SETUP_GUIDE.md` for troubleshooting and detailed instructions.
