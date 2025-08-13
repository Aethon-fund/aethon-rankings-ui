# Aethon Rankings UI - TODO

## Frontend Display Issues (GitHub Pages)

The frontend currently shows "Error: Failed to fetch" because it's trying to connect to a backend API that isn't deployed yet.

### Options to Fix:

#### Option 1: Add Demo Mode (Recommended for Loveable integration)
- [ ] Create a demo mode that detects when backend is unavailable
- [ ] Add sample/mock data to display in demo mode
- [ ] Show sample stock rankings, positions, and performance metrics
- [ ] Add a banner indicating "Demo Mode - Sample Data"
- **Pros**: Visitors can see how the interface works without backend
- **Best for**: Showcasing the UI from Loveable main site

#### Option 2: Deploy the Backend API
- [ ] Choose hosting platform (Heroku, AWS, Railway, etc.)
- [ ] Deploy the Python backend from the main repository
- [ ] Set up PostgreSQL database
- [ ] Configure environment variables (API keys, etc.)
- [ ] Update `js/api-config.js` with deployed backend URL
- [ ] Configure CORS to accept requests from GitHub Pages domain
- **Pros**: Fully functional with real data
- **Cons**: Requires API keys, hosting costs, maintenance

#### Option 3: Static Screenshots Display
- [ ] Take screenshots of the working interface with data
- [ ] Create a simple landing page showing the screenshots
- [ ] Add captions explaining each feature
- [ ] Link to "Request Demo" or "Coming Soon"
- **Pros**: Quick and simple
- **Cons**: Not interactive

## Other TODOs

### Immediate
- [ ] Enable GitHub Pages in repository settings
- [ ] Test the deployed URL
- [ ] Add button on Loveable site linking to rankings UI

### Future Enhancements
- [ ] Add loading animations
- [ ] Improve error messaging
- [ ] Add data caching for better performance
- [ ] Mobile responsive improvements
- [ ] Dark mode toggle

## Notes
- Current GitHub Pages URL (once enabled): https://aethon-fund.github.io/aethon-rankings-ui/
- Backend currently runs on localhost:8001
- Frontend automatically switches between local and production API URLs