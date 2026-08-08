import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export enum EngineKind { Passive = 0,
                         BridgedEvm = 1,
                         NativeAtlas = 2,
                         FiatReserve = 3
}

export type HarvestData = { deployable: bigint;
                            reportedYield: bigint;
                            reportedAt: bigint
                          };

export type Witnesses<PS> = {
  authSecret(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  divHint(context: __compactRuntime.WitnessContext<Ledger, PS>,
          n_0: bigint,
          d_0: bigint): [PS, bigint];
}

export type ImpureCircuits<PS> = {
  poner_a_rendir(context: __compactRuntime.CircuitContext<PS>,
                 data_0: HarvestData): __compactRuntime.CircuitResults<PS, []>;
  currentIndex(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, bigint>;
  recordDeposit(context: __compactRuntime.CircuitContext<PS>, amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  recordWithdraw(context: __compactRuntime.CircuitContext<PS>, amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  setEngine(context: __compactRuntime.CircuitContext<PS>,
            newEngine_0: EngineKind): __compactRuntime.CircuitResults<PS, []>;
  setBufferBps(context: __compactRuntime.CircuitContext<PS>,
               newBufferBps_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  setStrategist(context: __compactRuntime.CircuitContext<PS>,
                newStrategistAuth_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  poner_a_rendir(context: __compactRuntime.CircuitContext<PS>,
                 data_0: HarvestData): __compactRuntime.CircuitResults<PS, []>;
  currentIndex(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, bigint>;
  recordDeposit(context: __compactRuntime.CircuitContext<PS>, amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  recordWithdraw(context: __compactRuntime.CircuitContext<PS>, amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  setEngine(context: __compactRuntime.CircuitContext<PS>,
            newEngine_0: EngineKind): __compactRuntime.CircuitResults<PS, []>;
  setBufferBps(context: __compactRuntime.CircuitContext<PS>,
               newBufferBps_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  setStrategist(context: __compactRuntime.CircuitContext<PS>,
                newStrategistAuth_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  poner_a_rendir(context: __compactRuntime.CircuitContext<PS>,
                 data_0: HarvestData): __compactRuntime.CircuitResults<PS, []>;
  currentIndex(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, bigint>;
  recordDeposit(context: __compactRuntime.CircuitContext<PS>, amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  recordWithdraw(context: __compactRuntime.CircuitContext<PS>, amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  setEngine(context: __compactRuntime.CircuitContext<PS>,
            newEngine_0: EngineKind): __compactRuntime.CircuitResults<PS, []>;
  setBufferBps(context: __compactRuntime.CircuitContext<PS>,
               newBufferBps_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  setStrategist(context: __compactRuntime.CircuitContext<PS>,
                newStrategistAuth_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  readonly yieldIndex: bigint;
  indexCheckpoints: {
    isFull(): boolean;
    checkRoot(rt_0: { field: bigint }): boolean;
    root(): __compactRuntime.MerkleTreeDigest;
    firstFree(): bigint;
    pathForLeaf(index_0: bigint, leaf_0: Uint8Array): __compactRuntime.MerkleTreePath<Uint8Array>;
    findPathForLeaf(leaf_0: Uint8Array): __compactRuntime.MerkleTreePath<Uint8Array> | undefined
  };
  readonly lastCheckpointAt: bigint;
  readonly totalCollateral: bigint;
  readonly deployedCapital: bigint;
  readonly activeEngine: EngineKind;
  readonly bufferBps: bigint;
  readonly governorAuth: Uint8Array;
  readonly strategistAuth: Uint8Array;
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
               govAuth_0: Uint8Array,
               stratAuth_0: Uint8Array): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
