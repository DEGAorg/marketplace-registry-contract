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

import {
  type CircuitContext,
  QueryContext,
  sampleContractAddress,
  constructorContext
} from "@midnight-ntwrk/compact-runtime";
import {
  Contract,
  type Ledger,
  ledger
} from "../managed/marketplace-registry/contract/index.cjs";
import { type MarketplaceRegistryPrivateState, witnesses } from "../witnesses.js";

// This is over-kill for such a simple contract, but the same pattern can be used to test more
// complex contracts.
export class MarketplaceRegistrySimulator {
  readonly contract: Contract<MarketplaceRegistryPrivateState>;
  circuitContext: CircuitContext<MarketplaceRegistryPrivateState>;

  constructor() {
    this.contract = new Contract<MarketplaceRegistryPrivateState>(witnesses);
    const {
      currentPrivateState,
      currentContractState,
      currentZswapLocalState
    } = this.contract.initialState(
      constructorContext({}, "0".repeat(64))
    );
    this.circuitContext = {
      currentPrivateState,
      currentZswapLocalState,
      originalState: currentContractState,
      transactionContext: new QueryContext(
        currentContractState.data,
        sampleContractAddress()
      )
    };
  }

  public getLedger(): Ledger {
    return ledger(this.circuitContext.transactionContext.state);
  }

  public getPrivateState(): MarketplaceRegistryPrivateState {
    return this.circuitContext.currentPrivateState;
  }

  public register(email: string): Ledger {
    // Update the current context to be the result of executing the circuit.
    this.circuitContext = this.contract.impureCircuits.register(
      this.circuitContext,
      email
    ).context;
    return ledger(this.circuitContext.transactionContext.state);
  }

  public verifyEmail(publicKey: Uint8Array): string {
    const result = this.contract.impureCircuits.verify_email(
      this.circuitContext,
      publicKey
    );
    return result.result;
  }

  public readOwnPublicKey(): Uint8Array {
    const result = this.contract.impureCircuits.read_own_public_key(
      this.circuitContext
    );
    return result.result;
  }
}
