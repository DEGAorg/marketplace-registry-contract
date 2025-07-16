# Marketplace Registry DApp

[![Generic badge](https://img.shields.io/badge/Compact%20Compiler-0.23.0-1abc9c.svg)](https://shields.io/)  
[![Generic badge](https://img.shields.io/badge/TypeScript-5.8.3-blue.svg)](https://shields.io/)

## Prerequisites

1. You must have NodeJS version 22.15 or greater installed.
2. Download the latest version of the Compact compiler from [the compiler release page](https://docs.midnight.network/relnotes/compact) and follow the instructions to install it (in particular the instructions regarding permissions that must be set to compile the contracts).
3. Create a directory for the compiler executables, and unzip the downloaded file into that directory.
4. Add the directory to your shell's $PATH.

   For example, if you unzipped the Compact compiler in `$HOME/bin/compactc`:

   ```sh
   export PATH=$PATH:$HOME/bin/compactc
   ```

5. Run `npm install` in the root folder to install all the necessary packages.
6. Compile and build the code in the `marketplace-registry-contract` folder before running the code in the `marketplace-registry-cli` folder.  
   In the `marketplace-registry-contract` folder, run this command:

   ```sh
   npm run compact && npm run build
   ```

   Follow the instructions in the documentation [to install and launch the proof server](https://docs.midnight.network/develop/tutorial/using/proof-server).

7. Switch to the `marketplace-registry-cli` folder and run this command:

   ```sh
   npm run start-testnet-remote
   ```

   If you do not have a wallet yet, you will be given the option to create a new one. After getting your address, you can use the [official faucet](https://faucet.testnet-02.midnight.network/) to request coins to deploy a contract on testnet and interact with it.

## The marketplace registry contract

The [marketplace-registry-contract](marketplace-registry-contract) subdirectory contains:

- the [smart contract](marketplace-registry-contract/src/marketplace-registry.compact)
- some [unit tests](marketplace-registry-contract/src/test/marketplace-registry.test.ts) to test the smart contract

### The source code

The contract contains a declaration of state stored publicly on the blockchain:

```compact
export ledger round: MarketplaceRegistry;
```

and transition functions to manage marketplace registrations:

```compact
export circuit register(): [] {
  // Marketplace registration logic
}
```

To verify that the smart contract operates as expected,
we've provided some unit tests in `marketplace-registry-contract/src/test/marketplace-registry.test.ts`.

We've also provided tests that use a simple simulator, which illustrates
how to initialize and call the smart contract code locally without running a node in `marketplace-registry-contract/src/test/marketplace-registry-simulator.ts`

### Building the smart contract

Compile the contract:

```sh
npm run compact
```

You should see the following output from npm and the Compact compiler:

```sh
> compact
> compactc --skip-zk src/marketplace-registry.compact src/managed/marketplace-registry

Compactc version: 0.23.0
```

The compiler will complete very quickly because we've instructed it to skip ZK key generation with the option `--skip-zk`. The compiler's output files will be placed in the directory `marketplace-registry-contract/src/managed/marketplace-registry`.

Build the TypeScript source files:

```sh
npm run build
```

This creates the `marketplace-registry-contract/dist` directory.

Start unit tests:

```sh
npm run test
```

## CLI

After building the smart contract you can deploy it using the project in the subdirectory `marketplace-registry-cli`:

```sh
cd ../marketplace-registry-cli
```

Build from source code:

```sh
npm run build
```

Run the DApp:

```sh
npm run testnet-remote
```

If you want to launch all these steps at once, you can use this command:

```sh
npm run start-testnet-remote
```

The preceding entry point assumes you already have a proof server running locally.
If you want one to be started automatically for you, use instead:

```sh
npm run testnet-remote-ps
```

Then follow the instructions from the CLI.

## On-Chain Integration Tests

The [marketplace-registry-cli](marketplace-registry-cli) subdirectory also contains comprehensive on-chain integration tests that validate the marketplace registry contract functionality in a real blockchain environment.

### Test Setup

The integration tests are located in `marketplace-registry-cli/src/test-setup.ts` and provide automated setup for testing various scenarios:

- **Contract Deployment**: Automatically deploys the marketplace registry contract to testnet
- **Wallet Management**: Creates and funds multiple test wallets with different registration states
- **Transaction Testing**: Executes real transactions to validate payment verification logic
- **Scenario Coverage**: Tests both valid and invalid payment scenarios

### Environment Configuration

Before running the integration tests, you need to set up environment variables in a `.env` file in the `marketplace-registry-cli` directory:

```sh
FUND_WALLET_SEED=your_fund_wallet_seed
DESTINATION_ADDRESS=your_destination_address
FUNDING_AMOUNT=10000000
PAYMENT_AMOUNT=5000000
REGISTRATION_EMAIL=test@example.com
```

### Running the Integration Tests

To run the integration test setup:

```sh
cd marketplace-registry-cli
npm run build
node dist/test-setup.js
```

The test setup will:

1. **Deploy Contract**: Deploy the marketplace registry contract using the fund wallet
2. **Create Test Wallets**: Generate two test wallets with different registration states
3. **Fund Wallets**: Transfer funds from the fund wallet to test wallets
4. **Register Wallets**: Register one wallet in the contract (valid scenario)
5. **Execute Payments**: Send test payments from both registered and unregistered wallets
6. **Generate Test Data**: Create a `test-output.json` file with all test configuration

### Test Scenarios

The integration tests cover the following scenarios:

- **Valid Payment**: Payment from a registered wallet with correct amount
- **Invalid Payment**: Payment from an unregistered wallet
- **Wrong Amount**: Payment from valid sender but incorrect amount
- **Unknown Sender**: Payment from unregistered sender
- **No Payment**: Non-existent transaction validation
- **Identity Matching**: Valid identity match between on-chain sender and registered identity
- **Agent Registration**: Verification of agent registration status
- **Sender Mismatch**: Mismatch between on-chain transaction and off-chain session
- **Duplicate Detection**: Duplicate transaction handling

### Test Output

The test setup generates a `test-output.json` file containing:

- Contract addresses and wallet information
- Transaction IDs for all test scenarios
- Test amounts and expected values
- Metadata for integration with external test frameworks

This configuration file can be used by external systems (like Wallet MCP integration tests) to validate payment verification logic against real blockchain transactions.
