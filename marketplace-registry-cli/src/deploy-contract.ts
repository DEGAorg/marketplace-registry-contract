  import { config as dotenvConfig } from 'dotenv';
import { createLogger } from './logger-utils.js';
import { 
  buildWalletAndWaitForFunds, 
  configureProviders, 
  deploy, 
  register,
  setLogger,
} from './api.js';
import { TestnetRemoteConfig, type Config } from './config.js';
import { parseCoinPublicKeyToHex } from '@midnight-ntwrk/midnight-js-utils';
import * as Rx from 'rxjs';
import { nativeToken } from '@midnight-ntwrk/ledger';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFileSync } from 'fs';
import { getLedgerNetworkId } from '@midnight-ntwrk/midnight-js-network-id';

// Load environment variables from .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');
dotenvConfig({ path: envPath });

// Configuration constants - loaded from environment variables
const DEPLOY_WALLET_SEED = process.env.DEPLOY_WALLET_SEED;
const REGISTRATION_EMAIL = process.env.REGISTRATION_EMAIL;
const REGISTER_DEPLOYER = process.env.REGISTER_DEPLOYER === 'true';

// Gas fee estimates (in native tokens with 6 decimal places)
const ESTIMATED_GAS_FEE = 1_000_000n; // Estimated gas fee for contract deployment (1 token)

// Transaction timeout (10 seconds)
const TRANSACTION_TIMEOUT_MS = 10_000;

interface DeploymentResult {
  contractAddress: string;
  deployWalletAddress: string;
  deployWalletPublicKey: string;
  deployTxId: string;
  registrationTxId?: string;
  registrationEmail?: string;
}

/**
 * Simple timeout function to wait between transactions
 */
const wait = (ms: number, reason: string): Promise<void> => {
  console.info(`Waiting ${ms}ms for ${reason}`);
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Validates required environment variables
 */
const validateEnvironmentVariables = () => {
  if (!DEPLOY_WALLET_SEED) {
    throw new Error('DEPLOY_WALLET_SEED is required');
  }

  return {
    DEPLOY_WALLET_SEED,
    REGISTRATION_EMAIL,
    REGISTER_DEPLOYER
  };
};

/**
 * Main deployment function
 */
export const deployContract = async (config?: Config): Promise<DeploymentResult> => {
  const deployConfig = config || new TestnetRemoteConfig();
  const logger = await createLogger(deployConfig.logDir);
  setLogger(logger);
  
  logger.info('Starting contract deployment...');
  
  // Validate environment variables
  const env = validateEnvironmentVariables();
  
  logger.info(`Configuration: ${JSON.stringify({
    deployWalletSeed: env.DEPLOY_WALLET_SEED,
    registrationEmail: env.REGISTRATION_EMAIL,
    registerDeployer: env.REGISTER_DEPLOYER
  })}`);
  
  try {
    // Step 1: Create deploy wallet (with initial funds)
    logger.info('==XXSTEPXX== 1: Creating deploy wallet...');
    const deployWallet = await buildWalletAndWaitForFunds(deployConfig, env.DEPLOY_WALLET_SEED, 'deploy-wallet');
    const deployWalletState = await Rx.firstValueFrom(deployWallet.state());
    logger.info(`Deploy wallet created with address: ${deployWalletState.address}`);
    
    // Step 2: Deploy marketplace registry contract using deploy wallet
    logger.info('==XXSTEPXX== 2: Deploying marketplace registry contract using deploy wallet...');
    
    // Verify deploy wallet has sufficient funds before deployment
    const deployWalletStateBeforeDeployment = await Rx.firstValueFrom(deployWallet.state());
    const deployWalletBalance = deployWalletStateBeforeDeployment.balances[nativeToken()] || 0n;
    logger.info(`Deploy wallet balance before deployment: ${deployWalletBalance}`);
    
    if (deployWalletBalance < ESTIMATED_GAS_FEE) {
      throw new Error(`Insufficient funds in deploy wallet for contract deployment. Balance: ${deployWalletBalance}, Required: ${ESTIMATED_GAS_FEE}`);
    }
    
    const providers = await configureProviders(deployWallet, deployConfig);
    await wait(TRANSACTION_TIMEOUT_MS, 'prepare to deploy contract');
    const marketplaceRegistryContract = await deploy(providers, {});
    const contractAddress = marketplaceRegistryContract.deployTxData.public.contractAddress;
    const deployTxId = marketplaceRegistryContract.deployTxData.public.txId;
    logger.info(`Contract deployed at address: ${contractAddress}`);
    logger.info(`Deploy transaction ID: ${deployTxId}`);
    
    // Step 3: Optionally register deploy wallet in the contract
    let registrationTxId: string | undefined;
    if (env.REGISTER_DEPLOYER && env.REGISTRATION_EMAIL) {
      logger.info('==XXSTEPXX== 3: Registering deploy wallet in the contract...');
      const registrationResult = await register(marketplaceRegistryContract, env.REGISTRATION_EMAIL);
      registrationTxId = registrationResult.txId;
      logger.info(`Deploy wallet registered with email: ${env.REGISTRATION_EMAIL}`);
      logger.info(`Registration transaction ID: ${registrationTxId}`);
      
      // Wait for registration transaction to be processed
      logger.info(`Waiting ${TRANSACTION_TIMEOUT_MS / 1000} seconds for registration transaction to be processed...`);
      await wait(TRANSACTION_TIMEOUT_MS, 'registration transaction');
      logger.info('Registration transaction should be processed by now');
    } else {
      logger.info('==XXSTEPXX== 3: Skipping deploy wallet registration (REGISTER_DEPLOYER=false or REGISTRATION_EMAIL not provided)');
    }
    
    // Get deploy wallet public key for reference
    const deployWalletPublicKey = parseCoinPublicKeyToHex(deployWalletState.coinPublicKeyLegacy, getLedgerNetworkId());
    
    logger.info('Contract deployment completed successfully!');
    logger.info(`Contract Address: ${contractAddress}`);
    logger.info(`Deploy Wallet Address: ${deployWalletState.address}`);
    logger.info(`Deploy Wallet Public Key: ${deployWalletPublicKey}`);
    logger.info(`Deploy Transaction ID: ${deployTxId}`);
    if (registrationTxId) {
      logger.info(`Registration Transaction ID: ${registrationTxId}`);
    }
    logger.info('');
    logger.info('Deployment Summary:');
    logger.info(`- Contract deployed by deploy wallet (gas fee: ${ESTIMATED_GAS_FEE})`);
    logger.info(`- Estimated gas fee for contract deployment: ${ESTIMATED_GAS_FEE}`);
    logger.info(`- Transaction timeout: ${TRANSACTION_TIMEOUT_MS / 1000} seconds`);
    
    return {
      contractAddress,
      deployWalletAddress: deployWalletState.address,
      deployWalletPublicKey,
      deployTxId,
      registrationTxId,
      registrationEmail: env.REGISTRATION_EMAIL
    };
    
  } catch (error) {
    logger.error('Contract deployment failed:', error);
    throw error;
  }
};

/**
 * Generates the deployment output file
 */
const generateDeploymentOutput = (result: DeploymentResult): void => {
  const outputPath = join(__dirname, 'deployment-output.json');
  
  const deploymentOutput: any = {
    contract: {
      address: result.contractAddress,
      description: "Marketplace registry contract address"
    },
    deployWallet: {
      address: result.deployWalletAddress,
      publicKey: result.deployWalletPublicKey,
      description: "Wallet used to deploy the contract"
    },
    transactions: {
      deploy: {
        txId: result.deployTxId,
        description: "Contract deployment transaction"
      }
    },
    metadata: {
      deploymentScriptVersion: "1.0.0",
      lastUpdated: new Date().toISOString(),
      description: "Deployment output for Marketplace Registry contract"
    }
  };

  // Add registration info if available
  if (result.registrationTxId && result.registrationEmail) {
    deploymentOutput.transactions.registration = {
      txId: result.registrationTxId,
      email: result.registrationEmail,
      description: "Deploy wallet registration transaction"
    };
  }
  
  writeFileSync(outputPath, JSON.stringify(deploymentOutput, null, 2));
  console.log(`Deployment output file generated: ${outputPath}`);
};

// Run the deployment if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  deployContract()
    .then((result) => {
      // Generate the deployment output JSON file
      generateDeploymentOutput(result);
      
      console.log('Contract deployment completed successfully!');
      console.log(`Deployment output file generated: ${join(__dirname, 'deployment-output.json')}`);
      console.log(`Contract Address: ${result.contractAddress}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Contract deployment failed:', error);
      process.exit(1);
    });
}
