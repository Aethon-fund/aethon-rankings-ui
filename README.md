# Aethon Fund Stock Rankings UI 📈

AI-powered stock rankings visualization dashboard for Aethon Fund.

## 🚀 Quick Start

This is the frontend interface for the Aethon Fund stock rankings system. It displays AI-powered multi-model consensus analysis for investment decisions.

### Features
- Real-time stock rankings with consensus scores
- Interactive charts showing key characteristics
- Long/Short position tracking
- Model performance metrics
- CSV upload functionality for data updates

### Deployment

This frontend is designed to be deployed on GitHub Pages, Netlify, or any static hosting service.

#### GitHub Pages Setup:
1. Go to Settings → Pages
2. Source: Deploy from a branch
3. Branch: main, folder: / (root)
4. Save

Your app will be available at: `https://aethon-fund.github.io/aethon-rankings-ui/`

### Configuration

Before deploying, update the API endpoint in `js/api-config.js` to point to your backend server:

```javascript
const API_URL = 'https://your-backend-api.com';
```

### Local Development

```bash
# Using Python
python -m http.server 3000

# Using Node.js
npx http-server -p 3000
```

Then visit: http://localhost:3000

## 🔗 Links

- Main Website: [aethon.fund](https://aethon.fund)
- Backend Repository: *Private*

## 📝 License

© 2025 Aethon Fund. All rights reserved.