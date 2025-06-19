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
import { stdin as input, stdout as output } from 'node:process';
import { createInterface, type Interface } from 'node:readline/promises';
import { type Logger } from 'pino';
import { type StartedDockerComposeEnvironment, type DockerComposeEnvironment } from 'testcontainers';
import { type MarketplaceRegistryProviders, type DeployedMarketplaceRegistryContract } from './common-types';
import { type Config, StandaloneConfig } from './config';
import * as api from './api';

let logger: Logger;

/**
 * This seed gives access to tokens minted in the genesis block of a local development node - only
 * used in standalone networks to build a wallet with initial funds.
 */
const GENESIS_MINT_WALLET_SEED = '0000000000000000000000000000000000000000000000000000000000000001';

const DEPLOY_OR_JOIN_QUESTION = `
You can do one of the following:
  1. Deploy a new marketplace registry contract
  2. Join an existing marketplace registry contract
  3. Exit
Which would you like to do? `;

const MAIN_LOOP_QUESTION = `
You can do one of the following:
  1. Register email
  2. Check if public key is registered
  3. Verify email (pure read)
  4. Read own public key
  5. Display current registry state
  6. Exit
Which would you like to do? `;

const join = async (providers: MarketplaceRegistryProviders, rli: Interface): Promise<DeployedMarketplaceRegistryContract> => {
  const contractAddress = await rli.question('What is the contract address (in hex)? ');
  return await api.joinContract(providers, contractAddress);
};

const deployOrJoin = async (providers: MarketplaceRegistryProviders, rli: Interface): Promise<DeployedMarketplaceRegistryContract | null> => {
  while (true) {
    const choice = await rli.question(DEPLOY_OR_JOIN_QUESTION);
    switch (choice) {
      case '1': {
        return await api.deploy(providers, {});
      }
      case '2': {
        return await join(providers, rli);
      }
      case '3': {
        logger.info('Exiting...');
        return null;
      }
      default: {
        logger.error(`Invalid choice: ${choice}`);
      }
    }
  }
};

const mainLoop = async (providers: MarketplaceRegistryProviders, rli: Interface): Promise<void> => {
  const marketplaceRegistryContract = await deployOrJoin(providers, rli);
  if (marketplaceRegistryContract === null) {
    return;
  }
  while (true) {
    const choice = await rli.question(MAIN_LOOP_QUESTION);
    switch (choice) {
      case '1': {
        const email = await rli.question('Enter email to register: ');
        await api.register(marketplaceRegistryContract, email);
        break;
      }
      case '2': {
        const pkHex = await rli.question('Enter public key (in hex): ');
        const pk = new Uint8Array(Buffer.from(pkHex.replace('0x', ''), 'hex'));
        const isRegistered = await api.isPublicKeyRegistered(
          providers,
          marketplaceRegistryContract.deployTxData.public.contractAddress,
          pk,
        );
        logger.info(`Public key is ${isRegistered ? 'registered' : 'not registered'}`);
        break;
      }
      case '3': {
        const pkHex = await rli.question('Enter public key (in hex): ');
        const pk = new Uint8Array(Buffer.from(pkHex.replace('0x', ''), 'hex'));
        const verifiedEmail = await api.verifyEmailPure(
          providers,
          marketplaceRegistryContract.deployTxData.public.contractAddress,
          pk,
        );
        if (verifiedEmail !== null) {
          logger.info(`Verified email: ${verifiedEmail}`);
        } else {
          logger.info('Email not found for this public key');
        }
        break;
      }
      case '4': {
        const ownPk = await api.readOwnPublicKey(marketplaceRegistryContract);
        logger.info(`Own public key: ${Buffer.from(ownPk).toString('hex')}`);
        break;
      }
      case '5': {
        await api.displayRegistryState(providers, marketplaceRegistryContract);
        break;
      }
      case '6': {
        logger.info('Exiting...');
        return;
      }
      default: {
        logger.error(`Invalid choice: ${choice}`);
      }
    }
  }
};

const buildWalletFromSeed = async (config: Config, rli: Interface): Promise<Wallet & Resource> => {
  const seed = await rli.question('Enter your wallet seed: ');
  return await api.buildWalletAndWaitForFunds(config, seed, '');
};

const WALLET_LOOP_QUESTION = `
You can do one of the following:
  1. Build a fresh wallet
  2. Build wallet from a seed
  3. Exit
Which would you like to do? `;

const buildWallet = async (config: Config, rli: Interface): Promise<(Wallet & Resource) | null> => {
  if (config instanceof StandaloneConfig) {
    return await api.buildWalletAndWaitForFunds(config, GENESIS_MINT_WALLET_SEED, '');
  }
  while (true) {
    const choice = await rli.question(WALLET_LOOP_QUESTION);
    switch (choice) {
      case '1': {
        return await api.buildFreshWallet(config);
      }
      case '2': {
        return await buildWalletFromSeed(config, rli);
      }
      case '3': {
        logger.info('Exiting...');
        return null;
      }
      default: {
        logger.error(`Invalid choice: ${choice}`);
      }
    }
  }
};

const mapContainerPort = (env: StartedDockerComposeEnvironment, url: string, containerName: string) => {
  const mappedUrl = new URL(url);
  const container = env.getContainer(containerName);

  mappedUrl.port = String(container.getFirstMappedPort());

  return mappedUrl.toString().replace(/\/+$/, '');
};

export const run = async (config: Config, _logger: Logger, dockerEnv?: DockerComposeEnvironment): Promise<void> => {
  logger = _logger;
  api.setLogger(_logger);
  const rli = createInterface({ input, output, terminal: true });
  let env;
  if (dockerEnv !== undefined) {
    env = await dockerEnv.up();

    if (config instanceof StandaloneConfig) {
      config.indexer = mapContainerPort(env, config.indexer, 'marketplace-registry-indexer');
      config.indexerWS = mapContainerPort(env, config.indexerWS, 'marketplace-registry-indexer');
      config.node = mapContainerPort(env, config.node, 'marketplace-registry-node');
      config.proofServer = mapContainerPort(env, config.proofServer, 'marketplace-registry-proof-server');
    }
  }
  const wallet = await buildWallet(config, rli);
  try {
    if (wallet !== null) {
      const providers = await api.configureProviders(wallet, config);
      await mainLoop(providers, rli);
    }
  } catch (e) {
    if (e instanceof Error) {
      logger.error(`Found error '${e.message}'`);
      logger.info('Exiting...');
      logger.debug(`${e.stack}`);
    } else {
      throw e;
    }
  } finally {
    try {
      rli.close();
      rli.removeAllListeners();
    } catch (e) {
      logger.error(`Error closing readline interface: ${e}`);
    } finally {
      try {
        if (wallet !== null) {
          await wallet.close();
        }
      } catch (e) {
        logger.error(`Error closing wallet: ${e}`);
      } finally {
        try {
          if (env !== undefined) {
            await env.down();
            logger.info('Goodbye');
          }
        } catch (e) {
          logger.error(`Error shutting down docker environment: ${e}`);
        }
      }
    }
  }
};
