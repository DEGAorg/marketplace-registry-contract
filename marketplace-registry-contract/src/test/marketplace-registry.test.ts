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

import { MarketplaceRegistrySimulator } from "./marketplace-registry-simulator.js";
import {
  NetworkId,
  setNetworkId
} from "@midnight-ntwrk/midnight-js-network-id";
import { describe, it, expect } from "vitest";

setNetworkId(NetworkId.Undeployed);

describe("Marketplace Registry smart contract", () => {
  it("generates initial ledger state deterministically", () => {
    const simulator0 = new MarketplaceRegistrySimulator();
    const simulator1 = new MarketplaceRegistrySimulator();
    const ledger0 = simulator0.getLedger();
    const ledger1 = simulator1.getLedger();
    expect(ledger0.registry.size()).toBe(ledger1.registry.size());
    expect(ledger0.registry.isEmpty()).toBe(ledger1.registry.isEmpty());
  });

  it("properly initializes ledger state and private state", () => {
    const simulator = new MarketplaceRegistrySimulator();
    const initialLedgerState = simulator.getLedger();
    expect(initialLedgerState.registry.isEmpty()).toBe(true);
    expect(initialLedgerState.registry.size()).toBe(0n);
    const initialPrivateState = simulator.getPrivateState();
    expect(initialPrivateState).toEqual({});
  });

  it("registers a user correctly", () => {
    const simulator = new MarketplaceRegistrySimulator();
    const identifier = "test-identifier-123";
    const nextLedgerState = simulator.register(identifier);
    expect(nextLedgerState.registry.size()).toBe(1n);
    expect(nextLedgerState.registry.isEmpty()).toBe(false);
  });

  it("can read own public key", () => {
    const simulator = new MarketplaceRegistrySimulator();
    const publicKey = simulator.readOwnPublicKey();
    expect(publicKey).toBeInstanceOf(Uint8Array);
    expect(publicKey.length).toBe(32);
  });
});
