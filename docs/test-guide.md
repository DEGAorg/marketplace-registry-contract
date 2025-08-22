# Testing Guide

This guide explains the different types of tests available in the Marketplace Registry CLI and how to run them.

## Test Types

### 1. Unit Tests 🟢 (Safe, Fast)
Unit tests validate code logic without external dependencies.

**Location**: `src/test/`
**What they test**: Environment variables, configuration, error handling, output structures
**Dependencies**: None (no blockchain, no network calls)
**Runtime**: ~1-2 seconds

```bash
# Run all unit tests
npm run test:unit

# Run specific deployment unit tests
npm run test:deploy

# Run in watch mode for development
npm run test:watch
```

### 2. Integration Tests 🟡 (Docker Required)
Integration tests validate API functionality using Docker containers.

**Location**: `src/test/`
**What they test**: API interactions, contract functionality
**Dependencies**: Docker, test containers
**Runtime**: ~10-30 seconds

```bash
# Run API integration tests
npm run test-api
```

### 3. End-to-End Tests 🔴 (Testnet Required)
End-to-end tests validate against real testnet infrastructure.

**What they test**: Real blockchain interactions, wallet operations, contract deployment
**Dependencies**: Testnet access, funded wallet, environment variables
**Runtime**: ~2-5 minutes

```bash
# Run against testnet (requires funded wallet)
npm run test-against-testnet
```

## Quick Reference

| Command | Type | Dependencies | Safe for CI | Runtime |
|---------|------|-------------|-------------|---------|
| `npm run test:unit` | Unit | None | ✅ Yes | ~1-2s |
| `npm run test:deploy` | Unit | None | ✅ Yes | ~1-2s |
| `npm run test-api` | Integration | Docker | ⚠️ Conditional | ~10-30s |
| `npm run test-against-testnet` | E2E | Testnet + Funds | ❌ No | ~2-5min |

## Development Workflow

### For Local Development
```bash
# Start with unit tests
npm run test:unit

# Run integration tests when ready
npm run test-api
```

### For CI/CD Pipelines
```bash
# Safe for all CI/CD environments
npm run test:unit

# Only if Docker is available
npm run test-api

# Only for testnet deployment pipelines with secrets
npm run test-against-testnet
```

## Environment Variables for Tests

### Unit Tests
No environment variables required - tests run in isolation.

### Integration Tests
Managed automatically by Docker containers.

### End-to-End Tests
```bash
FUND_WALLET_SEED=your_funded_wallet_seed
DESTINATION_ADDRESS=test_destination_address
FUNDING_AMOUNT=10000000
PAYMENT_AMOUNT=5000000
REGISTRATION_EMAIL=test@example.com
```

## Adding New Tests

### Unit Tests
Add new test files to `src/test/` with the `.test.ts` extension:

```typescript
import { describe, it, expect } from 'vitest';

describe('Your Module', () => {
  it('should do something', () => {
    expect(true).toBe(true);
  });
});
```

### Integration Tests
Extend existing test files in `src/test/` or create new ones that use the test commons:

```typescript
import { TestEnvironment } from './commons.js';

// Use TestEnvironment for Docker-based testing
```

## Troubleshooting

### Unit Test Issues
- **Module not found**: Check import paths are correct
- **Environment variable errors**: Tests should mock/stub external dependencies

### Integration Test Issues
- **Docker not running**: Ensure Docker is installed and running
- **Port conflicts**: Stop other services using the same ports
- **Timeout errors**: Increase timeout values or check Docker resource limits

### End-to-End Test Issues
- **Insufficient funds**: Ensure test wallet has sufficient balance
- **Network connectivity**: Check testnet endpoint availability
- **Environment variables**: Verify all required variables are set correctly
