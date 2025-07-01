// This file is part of midnightntwrk/marketplace-registry.
// Copyright (C) 2025 Midnight Foundation
// SPDX-License-Identifier: Apache-2.0
// Licensed under the Apache License, Version 2.0 (the "License");
// You may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { config as dotenvConfig } from 'dotenv';
import { type Resource } from '@midnight-ntwrk/wallet';
import { type Wallet } from '@midnight-ntwrk/wallet-api';
import { type Logger } from 'pino';
import { createLogger } from './logger-utils.js';
import { 
  buildWalletAndWaitForFunds, 
  buildWalletAndWaitForSync,
  buildFreshWallet, 
  configureProviders, 
  deploy, 
  register,
  randomBytes,
  setLogger,
  waitForSync
} from './api.js';
import { TestnetRemoteConfig, type Config } from './config.js';
import { type MarketplaceRegistryProviders, type DeployedMarketplaceRegistryContract } from './common-types.js';
import { toHex } from '@midnight-ntwrk/midnight-js-utils';
import * as Rx from 'rxjs';
import { type TransactionId, nativeToken } from '@midnight-ntwrk/ledger';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');
dotenvConfig({ path: envPath });

// Configuration constants - loaded from environment variables
const FUND_WALLET_SEED = process.env.FUND_WALLET_SEED;
const DESTINATION_ADDRESS = process.env.DESTINATION_ADDRESS;
const FUNDING_AMOUNT = process.env.FUNDING_AMOUNT;
const PAYMENT_AMOUNT = process.env.PAYMENT_AMOUNT;
const REGISTRATION_EMAIL = process.env.REGISTRATION_EMAIL;

// Validate required environment variables
const validateEnvironmentVariables = () => {
  if (!FUND_WALLET_SEED) throw new Error('FUND_WALLET_SEED is required');
  if (!DESTINATION_ADDRESS) throw new Error('DESTINATION_ADDRESS is required');
  if (!FUNDING_AMOUNT) throw new Error('FUNDING_AMOUNT is required');
  if (!PAYMENT_AMOUNT) throw new Error('PAYMENT_AMOUNT is required');
  if (!REGISTRATION_EMAIL) throw new Error('REGISTRATION_EMAIL is required');

  return {
    FUND_WALLET_SEED,
    DESTINATION_ADDRESS,
    FUNDING_AMOUNT: BigInt(FUNDING_AMOUNT),
    PAYMENT_AMOUNT: BigInt(PAYMENT_AMOUNT),
    REGISTRATION_EMAIL
  };
};

interface TestSetupResult {
  fundWalletSeed: string;
  wallet1Seed: string;
  wallet2Seed: string;
  marketplaceRegistryContract: DeployedMarketplaceRegistryContract;
  contractAddress: string;
  wallet1PublicKey: string;
  wallet2PublicKey: string;
  destinationAddress: string;
  fundWalletAddress: string;
  wallet1Address: string;
  wallet2Address: string;
  fundingTxId1: string;
  fundingTxId2: string;
  paymentTxId1: string;
  paymentTxId2: string;
}

/**
 * Creates a new wallet with a random seed and saves its state
 */
const createNewWallet = async (config: Config, logger: Logger): Promise<{ wallet: Wallet & Resource; seed: string; address: string }> => {
  const seed = toHex(randomBytes(32));
  logger.info(`Creating new wallet with seed: ${seed}`);
  const wallet = await buildWalletAndWaitForSync(config, seed, '');
  const state = await Rx.firstValueFrom(wallet.state());
  
  // Save wallet state for later restoration
  await wallet.serializeState();
  logger.info(`Wallet state saved for seed: ${seed}`);
  
  return { wallet, seed, address: state.address };
};

/**
 * Restores a wallet from seed and waits for sync
 */
const restoreWallet = async (
  config: Config,
  seed: string,
  logger: Logger
): Promise<Wallet & Resource> => {
  logger.info(`Restoring wallet with seed: ${seed}`);
  
  // Build wallet from seed (this will restore from cache if available)
  const wallet = await buildWalletAndWaitForSync(config, seed, '');
  
  // Ensure wallet is fully synced before proceeding
  await waitForSync(wallet);
  
  const state = await Rx.firstValueFrom(wallet.state());
  logger.info(`Wallet restored and synced. Address: ${state.address}, Balance: ${state.balances[nativeToken()]}`);
  
  return wallet;
};

/**
 * Sends funds from one wallet to another using the wallet's available methods
 */
const sendFunds = async (
  fromWallet: Wallet & Resource, 
  toAddress: string, 
  amount: bigint, 
  logger: Logger
): Promise<TransactionId> => {
  const fromWalletState = await Rx.firstValueFrom(fromWallet.state());
  logger.info(`Sending ${amount} tokens from ${fromWalletState.address} to ${toAddress}`);
  
  try {
    // Step 1: Create transfer transaction recipe
    const transferRecipe = await fromWallet.transferTransaction([
      {
        amount: amount,
        type: nativeToken(),
        receiverAddress: toAddress
      }
    ]);
    
    // Step 2: Prove the transaction
    const provenTransaction = await fromWallet.proveTransaction(transferRecipe);
    
    // Step 3: Submit the proven transaction
    const txId = await fromWallet.submitTransaction(provenTransaction);
    
    logger.info(`Transfer transaction submitted with ID: ${txId}`);
    return txId;
    
  } catch (error) {
    logger.error(`Failed to send funds: ${error}`);
    throw error;
  }
};

/**
 * Main test setup function
 */
export const runTestSetup = async (config?: Config): Promise<TestSetupResult> => {
  const testConfig = config || new TestnetRemoteConfig();
  const logger = await createLogger(testConfig.logDir);
  setLogger(logger);
  
  logger.info('Starting test setup...');
  
  // Validate environment variables
  const env = validateEnvironmentVariables();
  
  logger.info(`Configuration: ${JSON.stringify({
    fundWalletSeed: env.FUND_WALLET_SEED,
    destinationAddress: env.DESTINATION_ADDRESS,
    fundingAmount: env.FUNDING_AMOUNT.toString(),
    paymentAmount: env.PAYMENT_AMOUNT.toString(),
    registrationEmail: env.REGISTRATION_EMAIL
  })}`);
  
  try {
    // Step 1: Create fund wallet (with initial funds)
    logger.info('==XXSTEPXX== 1: Creating fund wallet...');
    const fundWallet = await buildWalletAndWaitForFunds(testConfig, env.FUND_WALLET_SEED, 'fund-wallet');
    const fundWalletState = await Rx.firstValueFrom(fundWallet.state());
    logger.info(`Fund wallet created with address: ${fundWalletState.address}`);
    
    // Step 2: Create wallet1 (for contract deployment and registration)
    logger.info('==XXSTEPXX== 2: Creating wallet1...');
    const wallet1Result = await createNewWallet(testConfig, logger);
    logger.info(`Wallet1 created with address: ${wallet1Result.address}`);
    
    // Step 3: Create wallet2 (for unregistered payments)
    logger.info('==XXSTEPXX== 3: Creating wallet2...');
    const wallet2Result = await createNewWallet(testConfig, logger);
    logger.info(`Wallet2 created with address: ${wallet2Result.address}`);
    
    // Step 4: Send funds from fund wallet to wallet1 and wallet2
    logger.info('==XXSTEPXX== 4: Distributing funds from fund wallet...');
    let fundingTxId1: string;
    let fundingTxId2: string;
    
    try {
      // Restore fund wallet to ensure it's fully synced for transactions
      const restoredFundWallet = await restoreWallet(testConfig, env.FUND_WALLET_SEED, logger);
      fundingTxId1 = await sendFunds(restoredFundWallet, wallet1Result.address, env.FUNDING_AMOUNT, logger);
      fundingTxId2 = await sendFunds(restoredFundWallet, wallet2Result.address, env.FUNDING_AMOUNT, logger);
    } catch (error) {
      // log error and exit process since we can't continue without funds
      logger.error('Failed to send funds to wallets for testing, exiting...', error);
      process.exit(1);
    }
    
    // Step 5: Deploy marketplace registry contract using wallet1
    logger.info('==XXSTEPXX== 5: Deploying marketplace registry contract...');
    const restoredWallet1 = await restoreWallet(testConfig, wallet1Result.seed, logger);
    const providers = await configureProviders(restoredWallet1, testConfig);
    const marketplaceRegistryContract = await deploy(providers, {});
    const contractAddress = marketplaceRegistryContract.deployTxData.public.contractAddress;
    logger.info(`Contract deployed at address: ${contractAddress}`);
    
    // Step 6: Register wallet1 in the contract
    logger.info('==XXSTEPXX== 6: Registering wallet1 in the contract...');
    await register(marketplaceRegistryContract, env.REGISTRATION_EMAIL);
    logger.info(`Wallet1 registered with email: ${env.REGISTRATION_EMAIL}`);
    
    // Step 7: Send valid payment from wallet1 (registered) to destination
    logger.info('==XXSTEPXX== 7: Sending valid payment from wallet1 (registered) to destination...');
    let paymentTxId1: string;
    try {
      const restoredWallet1ForPayment = await restoreWallet(testConfig, wallet1Result.seed, logger);
      paymentTxId1 = await sendFunds(restoredWallet1ForPayment, env.DESTINATION_ADDRESS, env.PAYMENT_AMOUNT, logger);
    } catch (error) {
      logger.warn('Automatic payment from wallet1 failed, manual payment required');
      paymentTxId1 = 'manual-payment-required';
    }
    
    // Step 8: Send payment from wallet2 (unregistered) to destination
    logger.info('==XXSTEPXX== 8: Sending payment from wallet2 (unregistered) to destination...');
    let paymentTxId2: string;
    let restoredWallet2ForPayment: Wallet & Resource;
    try {
      restoredWallet2ForPayment = await restoreWallet(testConfig, wallet2Result.seed, logger);
      paymentTxId2 = await sendFunds(restoredWallet2ForPayment, env.DESTINATION_ADDRESS, env.PAYMENT_AMOUNT, logger);
    } catch (error) {
      logger.warn('Automatic payment from wallet2 failed, manual payment required');
      paymentTxId2 = 'manual-payment-required';
      // Still need to restore wallet2 for getting public key
      restoredWallet2ForPayment = await restoreWallet(testConfig, wallet2Result.seed, logger);
    }
    
    // Get public keys for reference
    const wallet1State = await Rx.firstValueFrom(restoredWallet1.state());
    const wallet2State = await Rx.firstValueFrom(restoredWallet2ForPayment.state());
    const wallet1PublicKey = Buffer.from(wallet1State.coinPublicKey).toString('hex');
    const wallet2PublicKey = Buffer.from(wallet2State.coinPublicKey).toString('hex');
    
    logger.info('Test setup completed successfully!');
    logger.info(`Contract Address: ${contractAddress}`);
    logger.info(`Wallet1 Public Key: ${wallet1PublicKey}`);
    logger.info(`Wallet2 Public Key: ${wallet2PublicKey}`);
    logger.info(`Destination Address: ${env.DESTINATION_ADDRESS}`);
    logger.info(`Fund Wallet Address: ${fundWalletState.address}`);
    logger.info(`Wallet1 Address: ${wallet1State.address}`);
    logger.info(`Wallet2 Address: ${wallet2State.address}`);
    logger.info(`Funding Transaction 1: ${fundingTxId1}`);
    logger.info(`Funding Transaction 2: ${fundingTxId2}`);
    logger.info(`Payment Transaction 1: ${paymentTxId1}`);
    logger.info(`Payment Transaction 2: ${paymentTxId2}`);
    logger.info('');
    logger.info('Test scenarios ready:');
    logger.info(`- Valid payment: wallet1 (registered) sent ${env.PAYMENT_AMOUNT} to destination`);
    logger.info(`- Invalid payment: wallet2 (unregistered) sent ${env.PAYMENT_AMOUNT} to destination`);
    logger.info('- Use the contract address and public keys for validation');
    
    return {
      fundWalletSeed: env.FUND_WALLET_SEED,
      wallet1Seed: wallet1Result.seed,
      wallet2Seed: wallet2Result.seed,
      marketplaceRegistryContract,
      contractAddress,
      wallet1PublicKey,
      wallet2PublicKey,
      destinationAddress: env.DESTINATION_ADDRESS,
      fundWalletAddress: fundWalletState.address,
      wallet1Address: wallet1Result.address,
      wallet2Address: wallet2Result.address,
      fundingTxId1,
      fundingTxId2,
      paymentTxId1,
      paymentTxId2
    };
    
  } catch (error) {
    logger.error('Test setup failed:', error);
    throw error;
  }
};

// Run the setup if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTestSetup()
    .then((result) => {
      console.log('Test setup completed successfully!');
      console.log('Results:', JSON.stringify({
        contractAddress: result.contractAddress,
        wallet1PublicKey: result.wallet1PublicKey,
        wallet2PublicKey: result.wallet2PublicKey,
        destinationAddress: result.destinationAddress,
        fundWalletAddress: result.fundWalletAddress,
        wallet1Address: result.wallet1Address,
        wallet2Address: result.wallet2Address,
        fundingTxId1: result.fundingTxId1,
        fundingTxId2: result.fundingTxId2,
        paymentTxId1: result.paymentTxId1,
        paymentTxId2: result.paymentTxId2
      }, null, 2));
      process.exit(0);
    })
    .catch((error) => {
      console.error('Test setup failed:', error);
      process.exit(1);
    });
} 