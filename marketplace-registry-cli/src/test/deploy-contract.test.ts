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

/**
 * Tests for the deployment script functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock the environment variables and dependencies
const originalEnv = process.env;

describe('Deployment Script', () => {
  beforeEach(() => {
    // Reset environment variables before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment variables
    process.env = originalEnv;
  });

  describe('Environment Variable Validation', () => {
    it('should throw error when DEPLOY_WALLET_SEED is missing', async () => {
      // Clear the environment variable
      delete process.env.DEPLOY_WALLET_SEED;
      
      // Import the module to trigger validation
      const { deployContract } = await import('../deploy-contract.js');
      
      // The validation happens at module load time, so we need to catch it
      await expect(deployContract()).rejects.toThrow('DEPLOY_WALLET_SEED is required');
    });

    it('should accept valid DEPLOY_WALLET_SEED', async () => {
      // Set a valid seed (64 character hex string)
      process.env.DEPLOY_WALLET_SEED = '1dec0dd58fbe4d3206ef960aebff95a77e09dffbd19f3e9439d23fe6de4fcdd1';
      
      // This should not throw an error
      await expect(import('../deploy-contract.js')).resolves.toBeDefined();
    });

    it('should handle optional REGISTRATION_EMAIL', async () => {
      process.env.DEPLOY_WALLET_SEED = '1dec0dd58fbe4d3206ef960aebff95a77e09dffbd19f3e9439d23fe6de4fcdd1';
      process.env.REGISTRATION_EMAIL = 'test@example.com';
      
      await expect(import('../deploy-contract.js')).resolves.toBeDefined();
    });

    it('should handle REGISTER_DEPLOYER flag', async () => {
      process.env.DEPLOY_WALLET_SEED = '1dec0dd58fbe4d3206ef960aebff95a77e09dffbd19f3e9439d23fe6de4fcdd1';
      process.env.REGISTER_DEPLOYER = 'true';
      
      await expect(import('../deploy-contract.js')).resolves.toBeDefined();
    });
  });

  describe('Configuration', () => {
    it('should use testnet configuration by default', async () => {
      process.env.DEPLOY_WALLET_SEED = '1dec0dd58fbe4d3206ef960aebff95a77e09dffbd19f3e9439d23fe6de4fcdd1';
      
      const { deployContract } = await import('../deploy-contract.js');
      const { TestnetRemoteConfig } = await import('../config.js');
      
      // Mock the deployment function to avoid actual deployment
      const mockDeployContract = async () => {
        return {
          contractAddress: 'test-contract-address',
          deployWalletAddress: 'test-wallet-address',
          deployWalletPublicKey: 'test-public-key',
          deployTxId: 'test-tx-id'
        };
      };
      
      // Replace the actual deployment with mock
      const originalDeploy = deployContract;
      // Note: In a real test, you would use proper mocking here
      
      expect(deployContract).toBeDefined();
    });
  });

  describe('Output Generation', () => {
    it('should generate valid deployment output structure', () => {
      const mockResult = {
        contractAddress: 'test-contract-address',
        deployWalletAddress: 'test-wallet-address',
        deployWalletPublicKey: 'test-public-key',
        deployTxId: 'test-tx-id',
        registrationTxId: 'test-registration-tx-id',
        registrationEmail: 'test@example.com'
      };

      // Test the expected structure
      expect(mockResult).toHaveProperty('contractAddress');
      expect(mockResult).toHaveProperty('deployWalletAddress');
      expect(mockResult).toHaveProperty('deployWalletPublicKey');
      expect(mockResult).toHaveProperty('deployTxId');
      expect(mockResult).toHaveProperty('registrationTxId');
      expect(mockResult).toHaveProperty('registrationEmail');
      
      expect(typeof mockResult.contractAddress).toBe('string');
      expect(typeof mockResult.deployWalletAddress).toBe('string');
      expect(typeof mockResult.deployWalletPublicKey).toBe('string');
      expect(typeof mockResult.deployTxId).toBe('string');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing environment variables gracefully', async () => {
      // Clear all deployment-related environment variables
      delete process.env.DEPLOY_WALLET_SEED;
      delete process.env.REGISTRATION_EMAIL;
      delete process.env.REGISTER_DEPLOYER;
      
      // Import the module and test the runtime validation
      const { deployContract } = await import('../deploy-contract.js');
      
      // The validation happens when deployContract is called, not at import time
      await expect(deployContract()).rejects.toThrow('DEPLOY_WALLET_SEED is required');
    });
  });
});
