# 🚀 Deployment Instructions

## Prerequisites
1. Create accounts on:
   - [Railway.app](https://railway.app) (for backend + database)
   - [Netlify.com](https://netlify.com) (for frontend)

## Step 1: Deploy Backend to Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Deploy backend
cd backend
railway init
railway add mysql
railway up

# Get your backend URL
railway status
# Copy the URL (e.g., https://your-app.up.railway.app)
```

## Step 2: Update Frontend Environment

Update `.env` file with your Railway backend URL:
```env
REACT_APP_API_URL=https://your-railway-app.up.railway.app/api
```

## Step 3: Deploy Frontend to Netlify

### Option 1: Drag & Drop
1. Run `npm run build`
2. Drag the `build` folder to [netlify.com](https://netlify.com)
3. Set environment variable: `REACT_APP_API_URL` = your Railway backend URL

### Option 2: Git Integration
1. Push code to GitHub
2. Connect GitHub repo to Netlify
3. Set build command: `npm run build`
4. Set publish directory: `build`
5. Set environment variable: `REACT_APP_API_URL` = your Railway backend URL

## Step 4: Update CORS in Backend

After getting your Netlify URL, update `backend/server.js`:
```javascript
const corsOptions = {
  origin: [
    'https://your-netlify-app.netlify.app',  // Replace with your Netlify URL
    'http://localhost:3000'  // Keep for development
  ],
  credentials: true
};
```

Then redeploy backend:
```bash
cd backend
railway up
```

## Environment Variables Summary

### Frontend (.env)
```env
REACT_APP_API_URL=https://your-railway-app.up.railway.app/api
```

### Backend (Railway Dashboard)
```env
NODE_ENV=production
JWT_SECRET=your_super_long_secret_key_here
DB_SSL=true  # If using Railway MySQL
```

## Testing Deployment

1. Visit your Netlify URL
2. Register a new account
3. Login and test creating/managing tasks
4. Check browser console for any errors

## Troubleshooting

- **CORS errors**: Update CORS origins in backend
- **API not found**: Check REACT_APP_API_URL is correct
- **Database errors**: Ensure Railway MySQL is properly configured
- **Build errors**: Check all environment variables are set

Happy deploying! 🎉
