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

import { type Resource } from '@midnight-ntwrk/wallet';
import { type Wallet } from '@midnight-ntwrk/wallet-api';
import { type Logger } from 'pino';
import { createLogger } from './logger-utils.js';
import { 
  buildWalletAndWaitForFunds, 
  buildFreshWallet, 
  configureProviders, 
  deploy, 
  register,
  randomBytes,
  setLogger
} from './api.js';
import { TestnetRemoteConfig, type Config } from './config.js';
import { type MarketplaceRegistryProviders, type DeployedMarketplaceRegistryContract } from './common-types.js';
import { toHex } from '@midnight-ntwrk/midnight-js-utils';
import * as Rx from 'rxjs';
import { type TransactionId, nativeToken } from '@midnight-ntwrk/ledger';

// Configuration constants - can be overridden by environment variables
const FUND_WALLET_SEED = process.env.FUND_WALLET_SEED || '0000000000000000000000000000000000000000000000000000000000000001';
const DESTINATION_ADDRESS = process.env.DESTINATION_ADDRESS || 'mn-shield-';
const FUNDING_AMOUNT = BigInt(process.env.FUNDING_AMOUNT || '10000000'); // 1 token in smallest unit
const PAYMENT_AMOUNT = BigInt(process.env.PAYMENT_AMOUNT || '10000000'); // 1 token in smallest unit
const REGISTRATION_EMAIL = process.env.REGISTRATION_EMAIL || 'test@example.com';

interface TestSetupResult {
  fundWallet: Wallet & Resource;
  wallet1: Wallet & Resource;
  wallet2: Wallet & Resource;
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
 * Creates a new wallet with a random seed
 */
const createNewWallet = async (config: Config, logger: Logger): Promise<Wallet & Resource> => {
  const seed = toHex(randomBytes(32));
  logger.info(`Creating new wallet with seed: ${seed}`);
  return await buildWalletAndWaitForFunds(config, seed, '');
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
  logger.info(`Configuration: ${JSON.stringify({
    fundWalletSeed: FUND_WALLET_SEED,
    destinationAddress: DESTINATION_ADDRESS,
    fundingAmount: FUNDING_AMOUNT.toString(),
    paymentAmount: PAYMENT_AMOUNT.toString(),
    registrationEmail: REGISTRATION_EMAIL
  })}`);
  
  try {
    // Step 1: Create fund wallet (with initial funds)
    logger.info('Step 1: Creating fund wallet...');
    const fundWallet = await buildWalletAndWaitForFunds(testConfig, FUND_WALLET_SEED, 'fund-wallet');
    const fundWalletState = await Rx.firstValueFrom(fundWallet.state());
    logger.info(`Fund wallet created with address: ${fundWalletState.address}`);
    
    // Step 2: Create wallet1 (for contract deployment and registration)
    logger.info('Step 2: Creating wallet1...');
    const wallet1 = await createNewWallet(testConfig, logger);
    const wallet1State = await Rx.firstValueFrom(wallet1.state());
    logger.info(`Wallet1 created with address: ${wallet1State.address}`);
    
    // Step 3: Create wallet2 (for unregistered payments)
    logger.info('Step 3: Creating wallet2...');
    const wallet2 = await createNewWallet(testConfig, logger);
    const wallet2State = await Rx.firstValueFrom(wallet2.state());
    logger.info(`Wallet2 created with address: ${wallet2State.address}`);
    
    // Step 4: Send funds from fund wallet to wallet1 and wallet2
    logger.info('Step 4: Distributing funds from fund wallet...');
    let fundingTxId1: string;
    let fundingTxId2: string;
    
    try {
      fundingTxId1 = await sendFunds(fundWallet, wallet1State.address, FUNDING_AMOUNT, logger);
      fundingTxId2 = await sendFunds(fundWallet, wallet2State.address, FUNDING_AMOUNT, logger);
    } catch (error) {
      // log error and exit process since we can't continue without funds
      logger.error('Failed to send funds to wallets for testing, exiting...', error);
      process.exit(1);
    }
    
    // Step 5: Deploy marketplace registry contract using wallet1
    logger.info('Step 5: Deploying marketplace registry contract...');
    const providers = await configureProviders(wallet1, testConfig);
    const marketplaceRegistryContract = await deploy(providers, {});
    const contractAddress = marketplaceRegistryContract.deployTxData.public.contractAddress;
    logger.info(`Contract deployed at address: ${contractAddress}`);
    
    // Step 6: Register wallet1 in the contract
    logger.info('Step 6: Registering wallet1 in the contract...');
    await register(marketplaceRegistryContract, REGISTRATION_EMAIL);
    logger.info(`Wallet1 registered with email: ${REGISTRATION_EMAIL}`);
    
    // Step 7: Send valid payment from wallet1 (registered) to destination
    logger.info('Step 7: Sending valid payment from wallet1 (registered) to destination...');
    let paymentTxId1: string;
    try {
      paymentTxId1 = await sendFunds(wallet1, DESTINATION_ADDRESS, PAYMENT_AMOUNT, logger);
    } catch (error) {
      logger.warn('Automatic payment from wallet1 failed, manual payment required');
      paymentTxId1 = 'manual-payment-required';
    }
    
    // Step 8: Send payment from wallet2 (unregistered) to destination
    logger.info('Step 8: Sending payment from wallet2 (unregistered) to destination...');
    let paymentTxId2: string;
    try {
      paymentTxId2 = await sendFunds(wallet2, DESTINATION_ADDRESS, PAYMENT_AMOUNT, logger);
    } catch (error) {
      logger.warn('Automatic payment from wallet2 failed, manual payment required');
      paymentTxId2 = 'manual-payment-required';
    }
    
    // Get public keys for reference
    const wallet1PublicKey = Buffer.from(wallet1State.coinPublicKey).toString('hex');
    const wallet2PublicKey = Buffer.from(wallet2State.coinPublicKey).toString('hex');
    
    logger.info('Test setup completed successfully!');
    logger.info(`Contract Address: ${contractAddress}`);
    logger.info(`Wallet1 Public Key: ${wallet1PublicKey}`);
    logger.info(`Wallet2 Public Key: ${wallet2PublicKey}`);
    logger.info(`Destination Address: ${DESTINATION_ADDRESS}`);
    logger.info(`Fund Wallet Address: ${fundWalletState.address}`);
    logger.info(`Wallet1 Address: ${wallet1State.address}`);
    logger.info(`Wallet2 Address: ${wallet2State.address}`);
    logger.info(`Funding Transaction 1: ${fundingTxId1}`);
    logger.info(`Funding Transaction 2: ${fundingTxId2}`);
    logger.info(`Payment Transaction 1: ${paymentTxId1}`);
    logger.info(`Payment Transaction 2: ${paymentTxId2}`);
    logger.info('');
    logger.info('Test scenarios ready:');
    logger.info('- Valid payment: wallet1 (registered) sent ${PAYMENT_AMOUNT} to destination');
    logger.info('- Invalid payment: wallet2 (unregistered) sent ${PAYMENT_AMOUNT} to destination');
    logger.info('- Use the contract address and public keys for validation');
    
    return {
      fundWallet,
      wallet1,
      wallet2,
      marketplaceRegistryContract,
      contractAddress,
      wallet1PublicKey,
      wallet2PublicKey,
      destinationAddress: DESTINATION_ADDRESS,
      fundWalletAddress: fundWalletState.address,
      wallet1Address: wallet1State.address,
      wallet2Address: wallet2State.address,
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