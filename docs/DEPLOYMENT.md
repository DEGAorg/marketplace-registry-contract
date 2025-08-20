# Contract Deployment Script

This document describes how to use the dedicated contract deployment script for deploying the Marketplace Registry contract to the testnet.

## Overview

The `deploy-contract.ts` script provides a clean, isolated way to deploy the Marketplace Registry contract using a custom wallet configured via environment variables. This is designed for CI/CD environments where you need to deploy contracts programmatically.

## Prerequisites

1. NodeJS version 22.15 or greater
2. Compact compiler installed and in your PATH
3. A wallet with sufficient funds for contract deployment
4. Environment variables configured (see below)

## Environment Variables

The deployment script uses the following environment variables:

### Required
- `DEPLOY_WALLET_SEED`: The seed of the wallet that will deploy the contract (must have sufficient funds)

### Optional
- `REGISTRATION_EMAIL`: Email to register the deploy wallet in the contract (only used if `REGISTER_DEPLOYER=true`)
- `REGISTER_DEPLOYER`: Set to `'true'` to register the deploy wallet in the contract after deployment (default: `false`)

## Usage

### Basic Deployment

```bash
# Set the required environment variable
export DEPLOY_WALLET_SEED="your-wallet-seed-here"

# Run the deployment script
npm run deploy-contract
```

### Deployment with Registration

```bash
# Set environment variables
export DEPLOY_WALLET_SEED="your-wallet-seed-here"
export REGISTRATION_EMAIL="deployer@example.com"
export REGISTER_DEPLOYER="true"

# Run the deployment script
npm run deploy-contract
```

### Using .env File

Create a `.env` file in the `marketplace-registry-cli` directory:

```env
DEPLOY_WALLET_SEED=your-wallet-seed-here
REGISTRATION_EMAIL=deployer@example.com
REGISTER_DEPLOYER=true
```

Then run:

```bash
npm run deploy-contract
```

## Output

The script will:

1. **Log deployment progress** to the console with detailed step-by-step information
2. **Generate a deployment output file** at `src/deployment-output.json` containing:
   - Contract address
   - Deploy wallet information (address and public key)
   - Transaction IDs (deploy and optionally registration)
   - Metadata about the deployment

### Example Output File

```json
{
  "contract": {
    "address": "contract-address-here",
    "description": "Marketplace registry contract address"
  },
  "deployWallet": {
    "address": "wallet-address-here",
    "publicKey": "wallet-public-key-here",
    "description": "Wallet used to deploy the contract"
  },
  "transactions": {
    "deploy": {
      "txId": "deploy-transaction-id",
      "description": "Contract deployment transaction"
    },
    "registration": {
      "txId": "registration-transaction-id",
      "email": "deployer@example.com",
      "description": "Deploy wallet registration transaction"
    }
  },
  "metadata": {
    "deploymentScriptVersion": "1.0.0",
    "lastUpdated": "2025-01-XX...",
    "description": "Deployment output for Marketplace Registry contract"
  }
}
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy Contract

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '22'
    
    - name: Install dependencies
      run: npm install
    
    - name: Deploy contract
      env:
        DEPLOY_WALLET_SEED: ${{ secrets.DEPLOY_WALLET_SEED }}
        REGISTRATION_EMAIL: ${{ secrets.REGISTRATION_EMAIL }}
        REGISTER_DEPLOYER: 'true'
      run: npm run deploy-contract
    
    - name: Upload deployment output
      uses: actions/upload-artifact@v4
      with:
        name: deployment-output
        path: marketplace-registry-cli/src/deployment-output.json
```

### GitLab CI Example

```yaml
deploy_contract:
  stage: deploy
  script:
    - npm install
    - npm run deploy-contract
  environment:
    name: testnet
  variables:
    DEPLOY_WALLET_SEED: $DEPLOY_WALLET_SEED
    REGISTRATION_EMAIL: $REGISTRATION_EMAIL
    REGISTER_DEPLOYER: "true"
  artifacts:
    paths:
      - marketplace-registry-cli/src/deployment-output.json
    expire_in: 1 week
```

## Error Handling

The script includes comprehensive error handling:

- **Insufficient funds**: Checks wallet balance before deployment and fails with a clear error message
- **Missing environment variables**: Validates required environment variables at startup
- **Transaction failures**: Logs detailed error information for debugging
- **Network issues**: Includes timeout handling for network operations

## Gas Fee Estimation

The script uses the following gas fee estimates:
- **Contract deployment**: 1,000,000 tokens (1 token with 6 decimal places)
- **Transaction timeout**: 10 seconds

These values are conservative estimates and may be adjusted based on network conditions.

## Security Considerations

1. **Wallet seed security**: Never commit wallet seeds to version control
2. **Environment variables**: Use secure methods to pass sensitive data in CI/CD
3. **Output file**: The deployment output file contains sensitive information and should be handled securely
4. **Network selection**: The script uses the testnet configuration by default

## Troubleshooting

### Common Issues

1. **"DEPLOY_WALLET_SEED is required"**
   - Ensure the environment variable is set correctly
   - Check that the .env file is in the correct location

2. **"Insufficient funds in deploy wallet"**
   - Ensure the wallet has at least 1,000,000 tokens (1 token with 6 decimal places)
   - Use the testnet faucet to fund the wallet if needed

3. **"Contract deployment failed"**
   - Check network connectivity
   - Verify the wallet seed is correct
   - Check the logs for detailed error information

### Getting Help

If you encounter issues:

1. Check the console output for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure the wallet has sufficient funds
4. Check network connectivity and testnet status
