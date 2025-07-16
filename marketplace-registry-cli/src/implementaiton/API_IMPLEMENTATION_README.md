# Marketplace Registry API Implementation

This file provides a clean, abstract interface for interacting with the Marketplace Registry contract. It's designed to be easily copied to other projects that already have a working wallet implementation.

## Files

- `api-implementation.ts` - Core contract interaction functions
- `api-usage-example.ts` - Example usage patterns
- `common-types.ts` - Type definitions (also needed)

## Core Functions

### Setup

```typescript
import {
  configureContractProviders,
  joinContract,
  type MarketplaceRegistryProviders,
  type DeployedMarketplaceRegistryContract,
} from './api-implementation';

// Configure providers (call once)
const providers: MarketplaceRegistryProviders = await configureContractProviders(
  indexerUrl,        // Your indexer URL
  indexerWSUrl,      // Your indexer WebSocket URL
  proofServerUrl,    // Your proof server URL
  walletProvider,    // Your existing wallet provider
  midnightProvider,  // Your existing midnight provider
);

// Join existing contract
const contract: DeployedMarketplaceRegistryContract = await joinContract(
  providers,
  contractAddress,   // The deployed contract address
);
```

### Register Text

```typescript
import { registerText } from './api-implementation';

const result = await registerText(contract, "my-text-identifier");
console.log(`Registered! TX: ${result.txId}, Block: ${result.blockHeight}`);
```

### Check Registration Status (Pure Read)

```typescript
import { isPublicKeyRegistered, verifyTextPure } from './api-implementation';

// Check if public key is registered
const isRegistered = await isPublicKeyRegistered(
  providers,
  contractAddress,
  publicKey,  // Uint8Array
);

// Get the text for a public key
const text = await verifyTextPure(
  providers,
  contractAddress,
  publicKey,  // Uint8Array
);
```

### Get Registry State

```typescript
import { getRegistryState } from './api-implementation';

const state = await getRegistryState(providers, contract);
console.log(`Contract: ${state.contractAddress}`);
if (state.registry) {
  console.log(`Size: ${state.registry.size()}`);
  console.log(`Empty: ${state.registry.isEmpty()}`);
}
```

## Integration Steps

1. **Copy the files** to your project:
   - `api-implementation.ts`
   - `common-types.ts`
   - `api-usage-example.ts` (optional, for reference)

2. **Install dependencies** (if not already present):
   ```bash
   npm install @midnight-ntwrk/marketplace-registry-contract
   npm install @midnight-ntwrk/midnight-js-contracts@2.0.1
   npm install @midnight-ntwrk/midnight-js-http-client-proof-provider@2.0.1
   npm install @midnight-ntwrk/midnight-js-indexer-public-data-provider@2.0.1
   npm install @midnight-ntwrk/midnight-js-node-zk-config-provider@2.0.1
   npm install @midnight-ntwrk/midnight-js-level-private-state-provider@2.0.1
   npm install @midnight-ntwrk/midnight-js-types@2.0.1
   npm install @midnight-ntwrk/midnight-js-utils
   npm install @midnight-ntwrk/compact-runtime@0.8.1
   npm install @midnight-ntwrk/ledger@4.0.0
   ```

3. **Update the ZK config path** in `api-implementation.ts`:
   ```typescript
   const CONTRACT_CONFIG = {
     privateStateStoreName: 'marketplace-registry-private-state',
     zkConfigPath: './path/to/your/zkir/files', // Update this path
   } as const;
   ```

4. **Use the functions** as shown in the examples above.

## Key Differences from Original API

- **No wallet management**: Assumes you already have a working wallet
- **Focused functions**: Each function has a single, clear purpose
- **Pure read operations**: `isPublicKeyRegistered` and `verifyTextPure` don't create transactions
- **Clean types**: All types are properly exported and documented
- **Minimal dependencies**: Only includes what's needed for contract interactions

## Error Handling

All functions include proper error handling and will return appropriate default values (false, null, etc.) if operations fail. The functions are designed to be safe to use in production environments.

## Type Safety

The implementation uses TypeScript with strict typing. All function parameters and return values are properly typed, making it easy to integrate with existing TypeScript projects. 