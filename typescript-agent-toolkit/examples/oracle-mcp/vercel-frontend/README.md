# Oracle MCP Dashboard

A modern React dashboard for monitoring Oracle MCP Server data, built with Next.js 14, Tailwind CSS v4, and TypeScript.

## Features

- 🎯 **Real-time Monitoring**: Live token prices and gas prices across multiple networks
- 📊 **Interactive Charts**: Historical price data with Recharts
- 🧪 **API Testing**: Built-in panel to test all Oracle MCP endpoints
- 🎨 **Modern UI**: Beautiful interface with Tailwind CSS v4 and Lucide React icons
- 🌙 **Dark Mode**: Automatic dark/light theme support
- 📱 **Responsive**: Works perfectly on mobile, tablet, and desktop

## Quick Start

### Prerequisites

- Node.js 18+
- A running Oracle MCP backend (AWS Express server)

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Update .env.local with your backend URL
# NEXT_PUBLIC_API_URL=http://localhost:5000

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Project Structure

```
vercel-frontend/
├── app/
│   ├── globals.css          # Tailwind CSS v4 styles
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Main dashboard page
├── components/
│   ├── ApiTestPanel.tsx     # API testing interface
│   ├── GasPriceCard.tsx     # Gas price display
│   ├── HealthStatus.tsx     # System health indicator
│   ├── HistoricalPriceChart.tsx # Price charts
│   └── TokenPriceCard.tsx   # Token price display
├── next.config.js           # Next.js configuration
├── postcss.config.mjs       # PostCSS config for Tailwind v4
├── package.json
└── tsconfig.json
```

## Configuration

### Environment Variables

- `NEXT_PUBLIC_API_URL`: Backend API URL (default: http://localhost:5000)

### API Endpoints

The dashboard connects to these backend endpoints:

- `GET /api/health` - System health check
- `POST /api/token-price` - Token price data
- `POST /api/gas-price` - Network gas prices
- `POST /api/historical-price` - Historical price data
- `POST /api/multi-network-gas` - Multi-network gas prices
- `POST /api/publish-to-contract` - Contract interaction simulation

## Dashboard Components

### Token Prices
- Real-time prices for ETH, BTC, MATIC, USDC
- 24h change indicators
- Market cap and volume data
- Source attribution

### Gas Prices
- Standard, Fast, and Instant gas prices
- Multi-network support (Polygon, Ethereum)
- Network-specific color coding
- Live timestamp updates

### Historical Charts
- Interactive price charts
- 7-day historical data
- Configurable token selection
- Responsive design

### API Test Panel
- Test all backend endpoints
- Real-time request/response display
- Copy functionality for results
- Error handling and status codes

### Health Monitoring
- System status indicators
- Service availability
- Cache metrics
- Uptime tracking

## Development

### Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

### Styling

This project uses Tailwind CSS v4 with the new PostCSS plugin approach:

```css
/* globals.css */
@import "tailwindcss";

/* Custom component classes */
.card {
  @apply bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700;
}
```

## Deployment to Vercel

### Automatic Deployment

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_API_URL=https://your-backend-url.com`
4. Deploy automatically on every push

### Manual Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
vercel --prod
```

## Backend Integration

This frontend is designed to work with the Oracle MCP AWS Express backend. Make sure your backend is running and accessible at the URL specified in `NEXT_PUBLIC_API_URL`.

### CORS Configuration

Ensure your backend allows requests from your Vercel domain:

```javascript
// In your Express backend
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://your-vercel-app.vercel.app'
  ],
  credentials: true
}));
```

## Performance

- **Next.js 14**: Latest React features with App Router
- **Tailwind CSS v4**: Optimized CSS with PostCSS plugin
- **Code Splitting**: Automatic route-based code splitting
- **Image Optimization**: Next.js automatic image optimization
- **Caching**: Smart caching for API responses

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm run lint` and `npm run type-check`
5. Submit a pull request

## License

MIT License - see the main project license for details.