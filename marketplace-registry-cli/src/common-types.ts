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

import { MarketplaceRegistry, type MarketplaceRegistryPrivateState } from '@midnight-ntwrk/marketplace-registry-contract';
import type { ImpureCircuitId, MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import type { DeployedContract, FoundContract } from '@midnight-ntwrk/midnight-js-contracts';

export type MarketplaceRegistryCircuits = ImpureCircuitId<MarketplaceRegistry.Contract<MarketplaceRegistryPrivateState>>;

export const MarketplaceRegistryPrivateStateId = 'marketplaceRegistryPrivateState';

export type MarketplaceRegistryProviders = MidnightProviders<MarketplaceRegistryCircuits, typeof MarketplaceRegistryPrivateStateId, MarketplaceRegistryPrivateState>;

export type MarketplaceRegistryContract = MarketplaceRegistry.Contract<MarketplaceRegistryPrivateState>;

export type DeployedMarketplaceRegistryContract = DeployedContract<MarketplaceRegistryContract> | FoundContract<MarketplaceRegistryContract>;

// New types for the registry functionality
export interface RegistryEntry {
  publicKey: Uint8Array;
  text: string;
}

export interface RegistryState {
  registry: {
    isEmpty(): boolean;
    size(): bigint;
    member(_key: Uint8Array): boolean;
    lookup(_key: Uint8Array): string;
    [Symbol.iterator](): Iterator<[Uint8Array, string]>;
  };
}
