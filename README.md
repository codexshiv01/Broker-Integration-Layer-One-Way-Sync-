# Broker Integration Layer

A robust, type-safe backend module for syncing trades from third-party brokers (Zerodha Kite Connect) with automated token management and extensible architecture.

## 🎯 Overview

This project implements a **one-way sync** system that fetches trade data from broker APIs, normalizes it into a consistent format, and handles authentication token lifecycle management. Built with TypeScript for complete type safety and designed for easy extension to support multiple brokers.

## ✨ Features

- ✅ **Complete Type Safety** - Strict TypeScript with comprehensive interfaces
- ✅ **Broker Adapter Pattern** - Easy to add new brokers
- ✅ **Token Management** - Automatic expiry detection and refresh flow
- ✅ **Data Normalization** - Consistent trade format across all brokers
- ✅ **Error Handling** - Custom error classes for different failure scenarios
- ✅ **Logging** - Configurable logging with multiple levels
- ✅ **Unit Tests** - Comprehensive test coverage for core logic
- ✅ **Production Ready** - Clean architecture and best practices

## 🏗️ Architecture

```
┌─────────────┐
│   Client    │
│  (Your App) │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  Sync Service   │  ← Main orchestration layer
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌─────────┐ ┌──────────────┐
│  Token  │ │   Broker     │
│ Manager │ │   Adapters   │
└─────────┘ └──────┬───────┘
                   │
            ┌──────┴──────┐
            │             │
            ▼             ▼
      ┌─────────┐   ┌─────────┐
      │ Zerodha │   │ Future  │
      │ Adapter │   │ Adapters│
      └─────────┘   └─────────┘
```

See [docs/architecture.md](docs/architecture.md) for detailed architecture diagram.

## 📦 Installation

```bash
# Clone the repository
git clone <repository-url>
cd broker-sync

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your API credentials
# ZERODHA_API_KEY=your_api_key
# ZERODHA_API_SECRET=your_api_secret
# ZERODHA_ACCESS_TOKEN=your_access_token
```

## 🚀 Quick Start

```typescript
import { syncService, tokenManager } from './src/index';
import { UserToken } from './src/models/token';

// 1. Store user token
const userToken: UserToken = {
  userId: 'user123',
  brokerName: 'zerodha',
  accessToken: 'your_access_token',
  refreshToken: 'your_refresh_token',
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  createdAt: new Date()
};

tokenManager.storeToken('user123', userToken);

// 2. Sync trades
const result = await syncService.syncTrades('user123', 'zerodha', {
  limit: 10
});

// 3. Process results
if (result.success) {
  console.log(`Synced ${result.count} trades`);
  result.trades.forEach(trade => {
    console.log(`${trade.symbol}: ${trade.transactionType} ${trade.quantity} @ ₹${trade.price}`);
  });
} else {
  console.error(`Sync failed: ${result.error}`);
}
```

## 📚 API Reference

### SyncService

#### `syncTrades(userId, brokerName, options?)`

Sync trades for a specific user and broker.

**Parameters:**
- `userId` (string) - User identifier
- `brokerName` (string) - Broker name (e.g., 'zerodha')
- `options` (SyncOptions) - Optional filters
  - `fromDate` - Start date for trade history
  - `toDate` - End date for trade history
  - `symbol` - Filter by specific symbol
  - `limit` - Maximum number of trades
  - `forceRefresh` - Force token refresh

**Returns:** `Promise<SyncResult>`

```typescript
interface SyncResult {
  success: boolean;
  trades: NormalizedTrade[];
  count: number;
  syncedAt: Date;
  userId: string;
  brokerName: string;
  error?: string;
  metadata?: Record<string, any>;
}
```

#### `getAvailableBrokers()`

Get list of registered broker adapters.

**Returns:** `string[]`

### TokenManager

#### `storeToken(userId, token)`

Store a user's authentication token.

#### `getToken(userId, brokerName)`

Retrieve a stored token.

#### `isTokenExpired(token)`

Check if a token has expired.

#### `refreshTokenIfNeeded(userId, brokerName, adapter)`

Automatically refresh token if expired.

## 🔧 Adding a New Broker

Follow these steps to add support for a new broker:

### 1. Create Adapter Class

Create a new file `src/adapters/yourbroker.ts`:

```typescript
import { IBrokerAdapter, FetchTradesOptions } from './base';
import { NormalizedTrade, RawTrade } from '../models/trade';
import { TokenResponse, TokenValidationResult } from '../models/token';

export class YourBrokerAdapter implements IBrokerAdapter {
  readonly brokerName = 'yourbroker';

  async fetchTrades(accessToken: string, options?: FetchTradesOptions): Promise<RawTrade[]> {
    // Implement API call to fetch trades
  }

  normalizeTradeData(rawTrade: RawTrade): NormalizedTrade {
    // Transform broker-specific format to normalized format
  }

  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    // Implement token refresh logic
  }

  async validateToken(accessToken: string): Promise<TokenValidationResult> {
    // Validate token with broker API
  }
}
```

### 2. Register Adapter

In `src/services/syncService.ts`, add your adapter:

```typescript
import { YourBrokerAdapter } from '../adapters/yourbroker';

private initializeAdapters(): void {
  // Existing adapters...
  
  const yourBrokerAdapter = new YourBrokerAdapter(apiKey);
  this.adapters.set(yourBrokerAdapter.brokerName, yourBrokerAdapter);
}
```

### 3. Add Tests

Create `tests/yourbroker.test.ts` to test normalization and sync logic.

That's it! Your new broker is now integrated.

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 📁 Project Structure

```
broker-sync/
├── src/
│   ├── adapters/          # Broker-specific adapters
│   │   ├── base.ts        # Adapter interface
│   │   └── zerodha.ts     # Zerodha implementation
│   ├── models/            # Data models
│   │   ├── trade.ts       # Normalized trade model
│   │   └── token.ts       # Token types
│   ├── services/          # Business logic
│   │   ├── tokenManager.ts
│   │   └── syncService.ts
│   ├── utils/             # Utilities
│   │   ├── errors.ts      # Custom errors
│   │   └── logger.ts      # Logging
│   └── index.ts           # Main entry point
├── tests/                 # Unit tests
├── examples/              # Usage examples
├── docs/                  # Documentation
└── package.json
```

## 🔑 Environment Variables

Create a `.env` file with the following variables:

```env
# Zerodha Kite Connect
ZERODHA_API_KEY=your_api_key_here
ZERODHA_API_SECRET=your_api_secret_here
ZERODHA_ACCESS_TOKEN=your_access_token_here

# Logging
LOG_LEVEL=info  # debug, info, warn, error
```

## 🎨 Design Decisions

### 1. **Adapter Pattern**
Each broker has its own adapter implementing `IBrokerAdapter`. This makes it easy to add new brokers without modifying existing code.

### 2. **Normalized Trade Model**
All brokers return data in different formats. We normalize everything into a consistent `NormalizedTrade` structure with fields like `symbol`, `quantity`, `price`, `timestamp`, etc.

### 3. **In-Memory Token Storage**
For simplicity, tokens are stored in memory. In production, you'd want to use a database or secure key-value store.

### 4. **Token Lifecycle Management**
Tokens are automatically checked for expiry before each sync. If expired, the system attempts to refresh them.

### 5. **Error Handling**
Custom error classes (`TokenExpiredError`, `APIError`, etc.) provide clear error context for different failure scenarios.

### 6. **Type Safety**
Strict TypeScript configuration ensures compile-time safety and better developer experience.

## 🚧 Assumptions & Limitations

### Assumptions
- API keys and tokens are already available (no OAuth flow implementation)
- Trades are fetched for the current day only (Zerodha API limitation)
- Token refresh is simulated for Zerodha (requires manual re-authentication)

### Limitations
- **Historical Data**: Zerodha Kite Connect only provides current day's trades
- **Token Refresh**: Zerodha requires manual login flow for new tokens
- **In-Memory Storage**: Tokens are not persisted across restarts
- **Rate Limiting**: No built-in rate limiting (should be added for production)

## 📊 Sample Data

Sample Zerodha API responses are available in `examples/sample-responses/` for testing and development.

## 🔗 Resources

- [Zerodha Kite Connect API Documentation](https://kite.trade/docs/connect/v3/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Jest Testing Framework](https://jestjs.io/)

## 📝 License

MIT

## 👥 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Implement your changes with tests
4. Submit a pull request

## 📧 Support

For questions or issues, please open a GitHub issue.

---

**Built with ❤️ by Shivansh Agrawal**
