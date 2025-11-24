# 🚀 GammonGuru Deployment Guide

## 📋 Aperçu

GammonGuru s'appuie sur un backend **Express.js + Prisma** (déployé sur Render) et un frontend **Vue 3** (Netlify). Les fonctionnalités en production couvrent la création et la gestion de parties `/api/games`, l'authentification, ainsi que les fondations de la couche IA.

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   AI Services   │
│   (Netlify)     │◄──►│   (Railway)     │◄──►│  (Claude/OpenAI)│
│   Vue.js        │    │   Node.js       │    │   Replicate     │
│   WebSocket     │    │   Express       │    │   APIs          │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔧 Backend Deployment (Render)

### 1. Prerequisites
- Railway account
- GitHub repository connected

### 2. Configuration
Le backend est déployé sur Render (web service Node basé sur Express) avec Netlify Functions en complément pour certaines actions serverless.

### 3. Environment Variables
À définir dans Render :
```bash
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=super-secret
SUPABASE_SERVICE_KEY=...
SUPABASE_URL=https://....supabase.co
``` 
Ajouter les clés IA (Claude/OpenAI) si nécessaire.

### 4. Deployment Steps
1. Connecter le dépôt GitHub à Render.
2. Définir les variables d'environnement ci-dessus.
3. Activer le build automatique (`npm install && npm run build`).
4. Avant chaque déploiement, exécuter localement :
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```
   (en production, utiliser `npx prisma migrate deploy`).
5. Déployer : Render se charge du démarrage via `npm start`.

### 5. Health Check
Health check: `https://gammon-guru-api.onrender.com/health`

## 🌐 Frontend Deployment (Netlify)

### 1. Prerequisites
- Netlify account
- Built frontend files

### 2. Build Commands
```bash
cd frontend
npm install
npm run build
```

### 3. Configuration
The `netlify.toml` file contains:
- Build settings
- SPA routing
- Security headers
- API redirects

### 4. Environment Variables
À définir dans Netlify :
```bash
VITE_API_BASE_URL=https://gammon-guru-api.onrender.com
VITE_WS_BASE_URL=wss://gammon-guru-api.onrender.com
```

### 5. Deployment Steps
1. Connect repo to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `frontend/dist`
4. Add environment variables
5. Deploy!

## 🔌 WebSocket Configuration

### Development
- Backend: `ws://localhost:3000`
- Frontend: `http://localhost:5173`

### Production
- Backend: `wss://gammon-guru-api.onrender.com`
- Frontend: `https://gammon-guru.netlify.app`

### WebSocket Endpoints
- Notifications: `wss://backend/ws/notifications?token=xxx`
- Game rooms: `wss://backend/ws/game/:id?token=xxx`
- Chat rooms: `wss://backend/ws/chat/:id?token=xxx`
- Tournament: `wss://backend/ws/tournament/:id?token=xxx`

## 🤖 AI Services Integration

Les intégrations IA (Claude/OpenAI, Replicate) sont en attente de branchement final ; conserver les variables masquées tant qu'elles ne sont pas utilisées.

## 🧪 Testing Production

### 1. Health Checks
```bash
# Backend health
curl https://gammon-guru-api.onrender.com/health

# Frontend accessibility
curl https://gammon-guru.netlify.app
```

### 2. WebSocket Testing
Open browser console and test:
```javascript
// Test WebSocket connection
const ws = new WebSocket('wss://your-backend.railway.app/ws/notifications?token=your-token');
ws.onopen = () => console.log('WebSocket connected!');
ws.onmessage = (e) => console.log('Received:', e.data);
```

### 3. AI Services Testing
```javascript
// Test Claude API
fetch('https://your-backend.railway.app/api/claude/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'Analyze this backgammon position',
    apiKey: 'your-claude-key'
  })
});
```

## 🔒 Security Considerations

### 1. API Keys
- Never expose API keys in frontend code
- Use environment variables
- Rotate keys regularly

### 2. JWT Authentication
- Strong secret keys
- Token expiration
- Secure token storage

### 3. CORS Configuration
- Whitelist allowed domains
- Secure headers
- HTTPS only in production

### 4. WebSocket Security
- Token-based authentication
- Rate limiting
- Connection monitoring

## 📊 Monitoring & Scaling

### Railway (Backend)
- Auto-scaling enabled
- Health checks every 30s
- Logs and metrics available
- Restart on failure

### Netlify (Frontend)
- CDN distribution
- Edge caching
- Build logs
- Form handling

### WebSocket Monitoring
```bash
# Check active connections
curl /api/ws/stats

# Monitor connection health
# View logs in Railway dashboard
```

## 🚨 Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check WSS URL (not WS)
   - Verify JWT token
   - Check CORS settings

2. **AI API Errors**
   - Verify API keys
   - Check rate limits
   - Review API permissions

3. **Build Failures**
   - Check Node.js version (18+)
   - Verify dependencies
   - Review build logs

4. **Environment Variables**
   - Ensure VITE_ prefix for frontend
   - Check Railway/Netlify dashboards
   - Restart services after changes

### Debug Commands
```bash
# Backend logs (Railway)
railway logs

# Frontend build test
cd frontend && npm run build

# WebSocket test
node backend/src/tests/quick-websocket-test.js
```

## 🎯 Going Live

### Pre-launch Checklist
- [ ] All environment variables set
- [ ] HTTPS certificates active
- [ ] Health checks passing
- [ ] WebSocket connections working
- [ ] AI services responding
- [ ] Frontend builds successfully
- [ ] Security headers configured
- [ ] Monitoring enabled

### Post-launch
- Monitor error rates
- Check WebSocket performance
- Review AI API usage
- Update documentation
- Plan scaling strategy

---

## 📞 Support

For deployment issues:
1. Check Railway and Netlify logs
2. Review this documentation
3. Test with the provided commands
4. Monitor WebSocket connections

**Happy Gaming! 🎲**
