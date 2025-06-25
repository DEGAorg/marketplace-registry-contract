import { type ContractAddress } from '@midnight-ntwrk/compact-runtime';
import { MarketplaceRegistry, witnesses } from '@midnight-ntwrk/marketplace-registry-contract';
import { type TransactionId } from '@midnight-ntwrk/ledger';
import { findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import {
  type MidnightProvider,
  type WalletProvider,
} from '@midnight-ntwrk/midnight-js-types';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { assertIsContractAddress } from '@midnight-ntwrk/midnight-js-utils';

// Import types from common-types
import {
  type MarketplaceRegistryProviders,
  type DeployedMarketplaceRegistryContract,
  type RegistryState,
  type MarketplaceRegistryContract,
  MarketplaceRegistryPrivateStateId,
} from '../common-types';

// Re-export types for external use
export type {
  MarketplaceRegistryProviders,
  DeployedMarketplaceRegistryContract,
  RegistryState,
  MarketplaceRegistryContract,
};
export { MarketplaceRegistryPrivateStateId };

// Contract instance
export const marketplaceRegistryContractInstance: MarketplaceRegistryContract = new MarketplaceRegistry.Contract(witnesses);

// Configuration constants
const CONTRACT_CONFIG = {
  privateStateStoreName: 'marketplace-registry-private-state',
  zkConfigPath: './marketplace-registry-contract/src/managed/marketplace-registry/zkir',
} as const;

/**
 * Configure providers for contract interactions
 * This function should be called once to set up the contract environment
 */
export const configureContractProviders = async (
  indexerUrl: string,
  indexerWSUrl: string,
  proofServerUrl: string,
  walletProvider: WalletProvider,
  midnightProvider: MidnightProvider,
): Promise<MarketplaceRegistryProviders> => {
  return {
    privateStateProvider: levelPrivateStateProvider<typeof MarketplaceRegistryPrivateStateId>({
      privateStateStoreName: CONTRACT_CONFIG.privateStateStoreName,
    }),
    publicDataProvider: indexerPublicDataProvider(indexerUrl, indexerWSUrl),
    zkConfigProvider: new NodeZkConfigProvider<'register' | 'verify_text' | 'read_own_public_key'>(
      CONTRACT_CONFIG.zkConfigPath,
    ),
    proofProvider: httpClientProofProvider(proofServerUrl),
    walletProvider,
    midnightProvider,
  };
};

/**
 * Join an existing deployed contract
 */
export const joinContract = async (
  providers: MarketplaceRegistryProviders,
  contractAddress: string,
): Promise<DeployedMarketplaceRegistryContract> => {
  const marketplaceRegistryContract = await findDeployedContract(providers, {
    contractAddress,
    contract: marketplaceRegistryContractInstance,
    privateStateId: MarketplaceRegistryPrivateStateId,
    initialPrivateState: {},
  });
  return marketplaceRegistryContract;
};

/**
 * Get the current ledger state of the contract
 */
export const getMarketplaceRegistryLedgerState = async (
  providers: MarketplaceRegistryProviders,
  contractAddress: ContractAddress,
): Promise<RegistryState | null> => {
  assertIsContractAddress(contractAddress);
  const state = await providers.publicDataProvider
    .queryContractState(contractAddress)
    .then((contractState) => (contractState != null ? MarketplaceRegistry.ledger(contractState.data) : null));
  return state;
};

/**
 * Register a text identifier in the marketplace registry
 * @param contract - The deployed contract instance
 * @param text - The text identifier to register
 * @returns Transaction data with transaction ID and block height
 */
export const registerText = async (
  contract: DeployedMarketplaceRegistryContract,
  text: string,
): Promise<{ txId: TransactionId; blockHeight: number }> => {
  const finalizedTxData = await contract.callTx.register(text);
  return {
    txId: finalizedTxData.public.txId,
    blockHeight: finalizedTxData.public.blockHeight,
  };
};

/**
 * Check if a public key is registered in the marketplace registry (pure read)
 * @param providers - Contract providers
 * @param contractAddress - Contract address
 * @param publicKey - Public key to check
 * @returns True if the public key is registered, false otherwise
 */
export const isPublicKeyRegistered = async (
  providers: MarketplaceRegistryProviders,
  contractAddress: ContractAddress,
  publicKey: Uint8Array,
): Promise<boolean> => {
  assertIsContractAddress(contractAddress);

  const state = await getMarketplaceRegistryLedgerState(providers, contractAddress);
  if (state === null) {
    return false;
  }

  try {
    return state.registry.member(publicKey);
  } catch (error) {
    return false;
  }
};

/**
 * Verify text identifier for a public key (pure read)
 * @param providers - Contract providers
 * @param contractAddress - Contract address
 * @param publicKey - Public key to verify
 * @returns The text identifier if found, null otherwise
 */
export const verifyTextPure = async (
  providers: MarketplaceRegistryProviders,
  contractAddress: ContractAddress,
  publicKey: Uint8Array,
): Promise<string | null> => {
  assertIsContractAddress(contractAddress);

  const state = await getMarketplaceRegistryLedgerState(providers, contractAddress);
  if (state === null) {
    return null;
  }

  try {
    // Check if the public key exists in the registry
    if (!state.registry.member(publicKey)) {
      return null;
    }

    // Return the text identifier associated with the public key
    return state.registry.lookup(publicKey);
  } catch (error) {
    return null;
  }
};

/**
 * Display current registry state information
 * @param providers - Contract providers
 * @param contract - The deployed contract instance
 * @returns Registry state information
 */
export const getRegistryState = async (
  providers: MarketplaceRegistryProviders,
  contract: DeployedMarketplaceRegistryContract,
): Promise<{ registry: RegistryState['registry'] | null; contractAddress: string }> => {
  const contractAddress = contract.deployTxData.public.contractAddress;
  const state = await getMarketplaceRegistryLedgerState(providers, contractAddress);
  return { contractAddress, registry: state?.registry ?? null };
}; 