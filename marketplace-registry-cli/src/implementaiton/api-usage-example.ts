/**
 * Example usage of the Marketplace Registry API implementation
 * This shows how to use the contract interactions in another project
 */

import {
  configureContractProviders,
  joinContract,
  registerText,
  isPublicKeyRegistered,
  verifyTextPure,
  getRegistryState,
  type MarketplaceRegistryProviders,
  type DeployedMarketplaceRegistryContract,
} from './api-implementation';

// Example function showing how to set up and use the contract
export async function exampleContractUsage(
  // Your existing wallet providers
  walletProvider: any, // Replace with your actual wallet provider type
  midnightProvider: any, // Replace with your actual midnight provider type
  
  // Network configuration
  indexerUrl: string,
  indexerWSUrl: string,
  proofServerUrl: string,
  
  // Contract details
  contractAddress: string,
  textToRegister: string,
  publicKeyToCheck: Uint8Array,
) {
  // Step 1: Configure providers
  const providers: MarketplaceRegistryProviders = await configureContractProviders(
    indexerUrl,
    indexerWSUrl,
    proofServerUrl,
    walletProvider,
    midnightProvider,
  );

  // Step 2: Join the existing contract
  const contract: DeployedMarketplaceRegistryContract = await joinContract(
    providers,
    contractAddress,
  );

  // Step 3: Register a text identifier
  console.log('Registering text identifier...');
  const registerResult = await registerText(contract, textToRegister);
  console.log(`Registration successful! TX ID: ${registerResult.txId}, Block: ${registerResult.blockHeight}`);

  // Step 4: Check if a public key is registered (pure read - no transaction)
  console.log('Checking if public key is registered...');
  const isRegistered = await isPublicKeyRegistered(
    providers,
    contractAddress,
    publicKeyToCheck,
  );
  console.log(`Public key registered: ${isRegistered}`);

  // Step 5: Verify text for a public key (pure read - no transaction)
  console.log('Verifying text for public key...');
  const verifiedText = await verifyTextPure(
    providers,
    contractAddress,
    publicKeyToCheck,
  );
  console.log(`Verified text: ${verifiedText || 'Not found'}`);

  // Step 6: Get registry state information
  console.log('Getting registry state...');
  const registryState = await getRegistryState(providers, contract);
  console.log(`Contract address: ${registryState.contractAddress}`);
  if (registryState.registry) {
    console.log(`Registry size: ${registryState.registry.size()}`);
    console.log(`Registry empty: ${registryState.registry.isEmpty()}`);
  } else {
    console.log('No registry state found');
  }

  return {
    registerResult,
    isRegistered,
    verifiedText,
    registryState,
  };
}

// Example function for just checking registration status
export async function checkRegistrationStatus(
  providers: MarketplaceRegistryProviders,
  contractAddress: string,
  publicKey: Uint8Array,
): Promise<{ isRegistered: boolean; text: string | null }> {
  const isRegistered = await isPublicKeyRegistered(providers, contractAddress, publicKey);
  const text = isRegistered ? await verifyTextPure(providers, contractAddress, publicKey) : null;
  
  return { isRegistered, text };
}

// Example function for just registering text
export async function registerTextOnly(
  contract: DeployedMarketplaceRegistryContract,
  text: string,
): Promise<{ txId: string; blockHeight: number }> {
  const result = await registerText(contract, text);
  return {
    txId: result.txId,
    blockHeight: result.blockHeight,
  };
} 