import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Note = { owner: Uint8Array;
                     amount: bigint;
                     maturesAt: bigint;
                     rateBps: bigint
                   };

export type Witnesses<PS> = {
  localSecretKey(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  noteNonce(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
}

export type ImpureCircuits<PS> = {
  deposit(context: __compactRuntime.CircuitContext<PS>,
          coin_0: { nonce: Uint8Array, color: Uint8Array, value: bigint },
          maturesAt_0: bigint): __compactRuntime.CircuitResults<PS, Uint8Array>;
}

export type ProvableCircuits<PS> = {
  deposit(context: __compactRuntime.CircuitContext<PS>,
          coin_0: { nonce: Uint8Array, color: Uint8Array, value: bigint },
          maturesAt_0: bigint): __compactRuntime.CircuitResults<PS, Uint8Array>;
}

export type PureCircuits = {
  ownerPublicKey(sk_0: Uint8Array): Uint8Array;
  noteCommitment(note_0: Note, nonce_0: Uint8Array): Uint8Array;
}

export type Circuits<PS> = {
  ownerPublicKey(context: __compactRuntime.CircuitContext<PS>, sk_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  noteCommitment(context: __compactRuntime.CircuitContext<PS>,
                 note_0: Note,
                 nonce_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  deposit(context: __compactRuntime.CircuitContext<PS>,
          coin_0: { nonce: Uint8Array, color: Uint8Array, value: bigint },
          maturesAt_0: bigint): __compactRuntime.CircuitResults<PS, Uint8Array>;
}

export type Ledger = {
  noteTree: {
    isFull(): boolean;
    checkRoot(rt_0: { field: bigint }): boolean;
    root(): __compactRuntime.MerkleTreeDigest;
    firstFree(): bigint;
    pathForLeaf(index_0: bigint, leaf_0: Uint8Array): __compactRuntime.MerkleTreePath<Uint8Array>;
    findPathForLeaf(leaf_0: Uint8Array): __compactRuntime.MerkleTreePath<Uint8Array> | undefined;
    history(): Iterator<__compactRuntime.MerkleTreeDigest>
  };
  readonly totalCollateral: bigint;
  readonly totalIssued: bigint;
  readonly acceptedColor: Uint8Array;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>,
               color_0: Uint8Array): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
