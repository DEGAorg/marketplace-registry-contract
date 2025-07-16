# Test Setup Script

This script sets up the environment for testing the marketplace registry contract scenarios described in `docs/tests/test-scenarios.md`.

## Overview

The test setup script performs the following operations:

1. **Creates a fund wallet** with initial funds (using the genesis seed)
2. **Creates wallet1** for contract deployment and registration
3. **Creates wallet2** for unregistered payments
4. **Sends funds** from fundWallet to wallet1 and wallet2
5. **Deploys the marketplace registry contract** using wallet1
6. **Registers wallet1** in the contract with an email
7. **Sends valid payment** from wallet1 (registered) to destination
8. **Sends payment** from wallet2 (unregistered) to destination

## Configuration

The script uses the following configuration constants that can be overridden by environment variables:

| Environment Variable | Default Value | Description |
|---------------------|---------------|-------------|
| `FUND_WALLET_SEED` | `0000000000000000000000000000000000000000000000000000000000000001` | Seed for the fund wallet |
| `DESTINATION_ADDRESS` | `mn-shield-` | Destination address for payments |
| `FUNDING_AMOUNT` | `10000000` | Amount to fund wallets (in smallest token unit) |
| `PAYMENT_AMOUNT` | `10000000` | Amount for test payments (in smallest token unit) |
| `REGISTRATION_EMAIL` | `test@example.com` | Email for wallet1 registration |

## Usage

### Basic Usage

```bash
# Run with default configuration
npm run test-setup
```

### With Custom Configuration

```bash
# Set custom values
export FUND_WALLET_SEED="your-fund-wallet-seed"
export DESTINATION_ADDRESS="0xYourDestinationAddress"
export FUNDING_AMOUNT="2000000000"
export PAYMENT_AMOUNT="150000000"
export REGISTRATION_EMAIL="agent@example.com"

# Run the setup
npm run test-setup
```

### Programmatic Usage

```typescript
import { runTestSetup } from './src/test-setup.js';
import { TestnetRemoteConfig } from './src/config.js';

const config = new TestnetRemoteConfig();
const result = await runTestSetup(config);

console.log('Contract Address:', result.contractAddress);
console.log('Wallet1 Public Key:', result.wallet1PublicKey);
console.log('Wallet2 Public Key:', result.wallet2PublicKey);
console.log('Funding Transaction 1:', result.fundingTxId1);
console.log('Funding Transaction 2:', result.fundingTxId2);
console.log('Payment Transaction 1:', result.paymentTxId1);
console.log('Payment Transaction 2:', result.paymentTxId2);
```

## Output

The script outputs comprehensive information for testing:

### Contract Information
- **Contract Address**: The deployed marketplace registry contract address

### Wallet Information
- **Fund Wallet Address**: Address of the fund wallet with initial tokens
- **Wallet1 Address**: Address of the registered wallet (for contract deployment)
- **Wallet2 Address**: Address of the unregistered wallet (for testing)
- **Wallet1 Public Key**: Public key of the registered wallet (wallet1)
- **Wallet2 Public Key**: Public key of the unregistered wallet (wallet2)
- **Destination Address**: The address where payments will be sent

### Wallet Seeds (for recovery/reuse)
- **Fund Wallet Seed**: Seed for the fund wallet (from environment or default)
- **Wallet1 Seed**: Randomly generated seed for wallet1
- **Wallet2 Seed**: Randomly generated seed for wallet2

### Transaction Information
- **Funding Transaction 1**: Transaction ID for funding wallet1
- **Funding Transaction 2**: Transaction ID for funding wallet2
- **Payment Transaction 1**: Transaction ID for payment from wallet1 (registered)
- **Payment Transaction 2**: Transaction ID for payment from wallet2 (unregistered)

### Amount Information
- **Funding Amount**: Amount sent to each wallet (from environment or default)
- **Payment Amount**: Amount sent in test payments (from environment or default)

## Test Scenarios

After running the setup, the following scenarios are automatically prepared:

### Test Case 1: Valid Payment Received ✅
- **Status**: Automatically executed
- **Action**: wallet1 (registered) sent payment to destination
- **Transaction**: `paymentTxId1`
- **Amount**: `PAYMENT_AMOUNT`

### Test Case 2: Payment With Wrong Amount
- **Status**: Ready for testing
- **Action**: Send incorrect amount from wallet1
- **Validation**: Verify amount validation

### Test Case 3: Payment From Unknown Sender ✅
- **Status**: Automatically executed
- **Action**: wallet2 (unregistered) sent payment to destination
- **Transaction**: `paymentTxId2`
- **Amount**: `PAYMENT_AMOUNT`

### Test Case 4: No Payment Received
- **Status**: Ready for testing
- **Action**: Check for transactions when none sent
- **Validation**: Verify graceful handling

### Test Case 5: Valid Identity Match
- **Status**: Ready for testing
- **Action**: Verify wallet1's identity matches registration
- **Data**: Use `wallet1PublicKey` and contract address

### Test Case 6: Agent Not Registered
- **Status**: Ready for testing
- **Action**: Verify wallet2 is not in registry
- **Data**: Use `wallet2PublicKey` and contract address

### Test Case 7: Sender Mismatch With Off-chain Session
- **Status**: Ready for testing
- **Action**: Test identity mismatch scenarios

### Test Case 8: Duplicate Transaction Detection
- **Status**: Ready for testing
- **Action**: Send same transaction twice
- **Validation**: Verify duplicate detection

### Test Case 9: Stale or Expired Transaction
- **Status**: Ready for testing
- **Action**: Send old transactions
- **Validation**: Verify time window validation

### Test Case 10: Multiple Transactions From Same Sender
- **Status**: Ready for testing
- **Action**: Send multiple transactions from same sender
- **Validation**: Verify context-based processing

## Wallet Recovery

The script logs all wallet seeds, allowing you to:

1. **Recover wallets**: Use the seeds to restore wallet state
2. **Reuse wallets**: Use the same wallets for additional testing
3. **Manual operations**: Perform manual transactions using the wallet addresses

### Example Recovery

```typescript
// Recover wallet1 using the logged seed
const wallet1Seed = "logged-seed-from-output";
const recoveredWallet1 = await buildWalletAndWaitForFunds(config, wallet1Seed, 'recovered-wallet1');

// Check balance
const state = await Rx.firstValueFrom(recoveredWallet1.state());
console.log('Recovered wallet balance:', state.balances[nativeToken()]);
```

## Notes

- The script uses the testnet configuration by default
- All wallets are created with random seeds except the fund wallet
- The contract is deployed using wallet1, which is then registered
- Wallet2 remains unregistered for testing unregistered sender scenarios
- **Fund transfers are automatic**: The script automatically sends funds from fundWallet to wallet1 and wallet2
- **Test payments are automatic**: The script automatically sends payments from both wallets to destination
- **Transaction IDs are returned**: All transaction IDs are logged and returned for tracking
- **Seeds are logged**: All wallet seeds are logged for recovery and reuse purposes
- **Error handling**: If fund transfers fail, the script exits with error code 1 