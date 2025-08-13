# Production Deployment Guide

## Quick Deploy Options

### 1. Heroku (Recommended - Free Tier Available)

#### Prerequisites:
- Heroku account: https://signup.heroku.com/
- Heroku CLI: https://devcenter.heroku.com/articles/heroku-cli

#### Steps:
```bash
# 1. Login to Heroku
heroku login

# 2. Create Heroku app
heroku create your-ai-chatbot-widget

# 3. Add MongoDB Atlas (Free tier)
heroku addons:create mongolab:sandbox

# 4. Set environment variables
heroku config:set NODE_ENV=production
heroku config:set OPENAI_API_KEY=your_openai_api_key_here
heroku config:set TEST_API_KEY=your_openai_api_key_here
heroku config:set ADMIN_USERNAME=admin
heroku config:set ADMIN_PASSWORD=your_secure_password
heroku config:set JWT_SECRET=your_secure_jwt_secret_here
heroku config:set SESSION_SECRET=your_secure_session_secret_here

# 5. Deploy
git push heroku main
```

Your app will be live at: `https://your-ai-chatbot-widget.herokuapp.com`

### 2. Railway (Modern Alternative)

#### Prerequisites:
- Railway account: https://railway.app/

#### Steps:
```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login and deploy
railway login
railway init
railway up
```

### 3. Render (Free Tier Available)

#### Prerequisites:
- Render account: https://render.com/

#### Steps:
1. Connect your GitHub repository
2. Create a new Web Service
3. Set environment variables in Render dashboard
4. Deploy automatically from GitHub

### 4. Vercel (For Node.js)

#### Prerequisites:
- Vercel account: https://vercel.com/

#### Steps:
```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Deploy
vercel

# 3. Set environment variables in Vercel dashboard
```

## Database Options

### MongoDB Atlas (Recommended - Free Tier)
1. Sign up: https://www.mongodb.com/cloud/atlas
2. Create free cluster (512MB)
3. Get connection string
4. Set MONGODB_URI environment variable

### Alternative: PlanetScale (MySQL-compatible)
1. Sign up: https://planetscale.com/
2. Create database
3. Modify models to use MySQL instead of MongoDB

## Environment Variables for Production

Set these in your hosting platform:

```
NODE_ENV=production
PORT=3000
OPENAI_API_KEY=your_openai_api_key_here
TEST_API_KEY=your_openai_api_key_here
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password
JWT_SECRET=your_secure_jwt_secret_here
SESSION_SECRET=your_secure_session_secret_here
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

## Custom Domain Setup

### After deployment:
1. Purchase domain from GoDaddy, Namecheap, etc.
2. Set up DNS records:
   - A record: `@` pointing to your server IP
   - CNAME record: `www` pointing to your domain
3. Configure SSL certificate (usually automatic)

## Monitoring & Maintenance

### Health Checks:
- Your app includes `/health` endpoint
- Most platforms provide automatic health monitoring

### Logs:
- Access logs through platform dashboard
- Monitor for errors and performance

### Scaling:
- Start with free tier
- Upgrade as user base grows
- Consider CDN for static assets

## Cost Estimate (Monthly)

### Free Tier:
- Heroku Free: $0 (limited hours)
- MongoDB Atlas: $0 (512MB)
- **Total: $0/month**

### Production Tier:
- Heroku Hobby: $7/month
- MongoDB Atlas M10: $10/month
- Custom domain: $10-15/year
- **Total: ~$17/month**

## Security for Production

1. **Environment Variables**: Never commit API keys
2. **HTTPS**: Enable SSL/TLS (automatic on most platforms)
3. **Rate Limiting**: Already implemented
4. **CORS**: Update ALLOWED_ORIGINS for your domain
5. **Admin Password**: Use strong password
6. **JWT Secret**: Use secure random string

## Quick Start Command

After setting up hosting account:

```bash
# For Heroku
npm run deploy:heroku

# For Railway  
npm run deploy:railway

# For Render
npm run deploy:render
```

## Support

If you need help with deployment:
1. Check platform documentation
2. Most platforms have free support for deployment issues
3. Community forums are very helpful
