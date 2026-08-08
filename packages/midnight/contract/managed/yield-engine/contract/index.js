import * as __compactRuntime from '@midnight-ntwrk/compact-runtime';
__compactRuntime.checkRuntimeVersion('0.16.0');

export var EngineKind;
(function (EngineKind) {
  EngineKind[EngineKind['Passive'] = 0] = 'Passive';
  EngineKind[EngineKind['BridgedEvm'] = 1] = 'BridgedEvm';
  EngineKind[EngineKind['NativeAtlas'] = 2] = 'NativeAtlas';
  EngineKind[EngineKind['FiatReserve'] = 3] = 'FiatReserve';
})(EngineKind || (EngineKind = {}));

const _descriptor_0 = new __compactRuntime.CompactTypeBytes(32);

const _descriptor_1 = new __compactRuntime.CompactTypeEnum(3, 1);

const _descriptor_2 = new __compactRuntime.CompactTypeUnsignedInteger(65535n, 2);

const _descriptor_3 = new __compactRuntime.CompactTypeUnsignedInteger(340282366920938463463374607431768211455n, 16);

const _descriptor_4 = new __compactRuntime.CompactTypeUnsignedInteger(18446744073709551615n, 8);

const _descriptor_5 = new __compactRuntime.CompactTypeUnsignedInteger(6277101735386680763835789423207666416102355444464034512895n, 24);

const _descriptor_6 = new __compactRuntime.CompactTypeUnsignedInteger(22300745198530623141535718272648361505980415n, 18);

const _descriptor_7 = new __compactRuntime.CompactTypeUnsignedInteger(4294967295n, 4);

class _HarvestData_0 {
  alignment() {
    return _descriptor_3.alignment().concat(_descriptor_3.alignment().concat(_descriptor_4.alignment()));
  }
  fromValue(value_0) {
    return {
      deployable: _descriptor_3.fromValue(value_0),
      reportedYield: _descriptor_3.fromValue(value_0),
      reportedAt: _descriptor_4.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_3.toValue(value_0.deployable).concat(_descriptor_3.toValue(value_0.reportedYield).concat(_descriptor_4.toValue(value_0.reportedAt)));
  }
}

const _descriptor_8 = new _HarvestData_0();

const _descriptor_9 = new __compactRuntime.CompactTypeVector(2, _descriptor_0);

const _descriptor_10 = __compactRuntime.CompactTypeBoolean;

class _Either_0 {
  alignment() {
    return _descriptor_10.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_10.fromValue(value_0),
      left: _descriptor_0.fromValue(value_0),
      right: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_10.toValue(value_0.is_left).concat(_descriptor_0.toValue(value_0.left).concat(_descriptor_0.toValue(value_0.right)));
  }
}

const _descriptor_11 = new _Either_0();

class _ContractAddress_0 {
  alignment() {
    return _descriptor_0.alignment();
  }
  fromValue(value_0) {
    return {
      bytes: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.bytes);
  }
}

const _descriptor_12 = new _ContractAddress_0();

const _descriptor_13 = __compactRuntime.CompactTypeField;

class _MerkleTreeDigest_0 {
  alignment() {
    return _descriptor_13.alignment();
  }
  fromValue(value_0) {
    return {
      field: _descriptor_13.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_13.toValue(value_0.field);
  }
}

const _descriptor_14 = new _MerkleTreeDigest_0();

const _descriptor_15 = new __compactRuntime.CompactTypeUnsignedInteger(255n, 1);

export class Contract {
  witnesses;
  constructor(...args_0) {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`Contract constructor: expected 1 argument, received ${args_0.length}`);
    }
    const witnesses_0 = args_0[0];
    if (typeof(witnesses_0) !== 'object') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor is not an object');
    }
    if (typeof(witnesses_0.authSecret) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named authSecret');
    }
    if (typeof(witnesses_0.divHint) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named divHint');
    }
    this.witnesses = witnesses_0;
    this.circuits = {
      poner_a_rendir: (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`poner_a_rendir: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const data_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('poner_a_rendir',
                                     'argument 1 (as invoked from Typescript)',
                                     'YieldEngine.compact line 144 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(data_0) === 'object' && typeof(data_0.deployable) === 'bigint' && data_0.deployable >= 0n && data_0.deployable <= 340282366920938463463374607431768211455n && typeof(data_0.reportedYield) === 'bigint' && data_0.reportedYield >= 0n && data_0.reportedYield <= 340282366920938463463374607431768211455n && typeof(data_0.reportedAt) === 'bigint' && data_0.reportedAt >= 0n && data_0.reportedAt <= 18446744073709551615n)) {
          __compactRuntime.typeError('poner_a_rendir',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'YieldEngine.compact line 144 char 1',
                                     'struct HarvestData<deployable: Uint<0..340282366920938463463374607431768211456>, reportedYield: Uint<0..340282366920938463463374607431768211456>, reportedAt: Uint<0..18446744073709551616>>',
                                     data_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_8.toValue(data_0),
            alignment: _descriptor_8.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._poner_a_rendir_0(context,
                                                partialProofData,
                                                data_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      currentIndex: (...args_1) => {
        if (args_1.length !== 1) {
          throw new __compactRuntime.CompactError(`currentIndex: expected 1 argument (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('currentIndex',
                                     'argument 1 (as invoked from Typescript)',
                                     'YieldEngine.compact line 176 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: { value: [], alignment: [] },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._currentIndex_0(context, partialProofData);
        partialProofData.output = { value: _descriptor_5.toValue(result_0), alignment: _descriptor_5.alignment() };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      recordDeposit: (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`recordDeposit: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const amount_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('recordDeposit',
                                     'argument 1 (as invoked from Typescript)',
                                     'YieldEngine.compact line 181 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(amount_0) === 'bigint' && amount_0 >= 0n && amount_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('recordDeposit',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'YieldEngine.compact line 181 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     amount_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_3.toValue(amount_0),
            alignment: _descriptor_3.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._recordDeposit_0(context,
                                               partialProofData,
                                               amount_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      recordWithdraw: (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`recordWithdraw: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const amount_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('recordWithdraw',
                                     'argument 1 (as invoked from Typescript)',
                                     'YieldEngine.compact line 194 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(amount_0) === 'bigint' && amount_0 >= 0n && amount_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('recordWithdraw',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'YieldEngine.compact line 194 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     amount_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_3.toValue(amount_0),
            alignment: _descriptor_3.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._recordWithdraw_0(context,
                                                partialProofData,
                                                amount_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      setEngine: (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`setEngine: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const newEngine_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('setEngine',
                                     'argument 1 (as invoked from Typescript)',
                                     'YieldEngine.compact line 277 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(newEngine_0) === 'number' && newEngine_0 >= 0 && newEngine_0 <= 3)) {
          __compactRuntime.typeError('setEngine',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'YieldEngine.compact line 277 char 1',
                                     'Enum<EngineKind, Passive, BridgedEvm, NativeAtlas, FiatReserve>',
                                     newEngine_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_1.toValue(newEngine_0),
            alignment: _descriptor_1.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._setEngine_0(context,
                                           partialProofData,
                                           newEngine_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      setBufferBps: (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`setBufferBps: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const newBufferBps_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('setBufferBps',
                                     'argument 1 (as invoked from Typescript)',
                                     'YieldEngine.compact line 282 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(newBufferBps_0) === 'bigint' && newBufferBps_0 >= 0n && newBufferBps_0 <= 65535n)) {
          __compactRuntime.typeError('setBufferBps',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'YieldEngine.compact line 282 char 1',
                                     'Uint<0..65536>',
                                     newBufferBps_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_2.toValue(newBufferBps_0),
            alignment: _descriptor_2.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._setBufferBps_0(context,
                                              partialProofData,
                                              newBufferBps_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      setStrategist: (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`setStrategist: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const newStrategistAuth_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('setStrategist',
                                     'argument 1 (as invoked from Typescript)',
                                     'YieldEngine.compact line 289 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(newStrategistAuth_0.buffer instanceof ArrayBuffer && newStrategistAuth_0.BYTES_PER_ELEMENT === 1 && newStrategistAuth_0.length === 32)) {
          __compactRuntime.typeError('setStrategist',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'YieldEngine.compact line 289 char 1',
                                     'Bytes<32>',
                                     newStrategistAuth_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(newStrategistAuth_0),
            alignment: _descriptor_0.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._setStrategist_0(context,
                                               partialProofData,
                                               newStrategistAuth_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      }
    };
    this.impureCircuits = {
      poner_a_rendir: this.circuits.poner_a_rendir,
      currentIndex: this.circuits.currentIndex,
      recordDeposit: this.circuits.recordDeposit,
      recordWithdraw: this.circuits.recordWithdraw,
      setEngine: this.circuits.setEngine,
      setBufferBps: this.circuits.setBufferBps,
      setStrategist: this.circuits.setStrategist
    };
    this.provableCircuits = {
      poner_a_rendir: this.circuits.poner_a_rendir,
      currentIndex: this.circuits.currentIndex,
      recordDeposit: this.circuits.recordDeposit,
      recordWithdraw: this.circuits.recordWithdraw,
      setEngine: this.circuits.setEngine,
      setBufferBps: this.circuits.setBufferBps,
      setStrategist: this.circuits.setStrategist
    };
  }
  initialState(...args_0) {
    if (args_0.length !== 3) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 3 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const constructorContext_0 = args_0[0];
    const govAuth_0 = args_0[1];
    const stratAuth_0 = args_0[2];
    if (typeof(constructorContext_0) !== 'object') {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'constructorContext' in argument 1 (as invoked from Typescript) to be an object`);
    }
    if (!('initialPrivateState' in constructorContext_0)) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialPrivateState' in argument 1 (as invoked from Typescript)`);
    }
    if (!('initialZswapLocalState' in constructorContext_0)) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialZswapLocalState' in argument 1 (as invoked from Typescript)`);
    }
    if (typeof(constructorContext_0.initialZswapLocalState) !== 'object') {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialZswapLocalState' in argument 1 (as invoked from Typescript) to be an object`);
    }
    if (!(govAuth_0.buffer instanceof ArrayBuffer && govAuth_0.BYTES_PER_ELEMENT === 1 && govAuth_0.length === 32)) {
      __compactRuntime.typeError('Contract state constructor',
                                 'argument 1 (argument 2 as invoked from Typescript)',
                                 'YieldEngine.compact line 123 char 1',
                                 'Bytes<32>',
                                 govAuth_0)
    }
    if (!(stratAuth_0.buffer instanceof ArrayBuffer && stratAuth_0.BYTES_PER_ELEMENT === 1 && stratAuth_0.length === 32)) {
      __compactRuntime.typeError('Contract state constructor',
                                 'argument 2 (argument 3 as invoked from Typescript)',
                                 'YieldEngine.compact line 123 char 1',
                                 'Bytes<32>',
                                 stratAuth_0)
    }
    const state_0 = new __compactRuntime.ContractState();
    let stateValue_0 = __compactRuntime.StateValue.newArray();
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    state_0.data = new __compactRuntime.ChargedState(stateValue_0);
    state_0.setOperation('poner_a_rendir', new __compactRuntime.ContractOperation());
    state_0.setOperation('currentIndex', new __compactRuntime.ContractOperation());
    state_0.setOperation('recordDeposit', new __compactRuntime.ContractOperation());
    state_0.setOperation('recordWithdraw', new __compactRuntime.ContractOperation());
    state_0.setOperation('setEngine', new __compactRuntime.ContractOperation());
    state_0.setOperation('setBufferBps', new __compactRuntime.ContractOperation());
    state_0.setOperation('setStrategist', new __compactRuntime.ContractOperation());
    const context = __compactRuntime.createCircuitContext(__compactRuntime.dummyContractAddress(), constructorContext_0.initialZswapLocalState.coinPublicKey, state_0.data, constructorContext_0.initialPrivateState);
    const partialProofData = {
      input: { value: [], alignment: [] },
      output: undefined,
      publicTranscript: [],
      privateTranscriptOutputs: []
    };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_15.toValue(0n),
                                                                                              alignment: _descriptor_15.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(0n),
                                                                                              alignment: _descriptor_5.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_15.toValue(1n),
                                                                                              alignment: _descriptor_15.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newArray()
                                                          .arrayPush(__compactRuntime.StateValue.newBoundedMerkleTree(
                                                                       new __compactRuntime.StateBoundedMerkleTree(16)
                                                                     )).arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(0n),
                                                                                                                        alignment: _descriptor_4.alignment() }))
                                                          .encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_15.toValue(2n),
                                                                                              alignment: _descriptor_15.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(0n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_15.toValue(3n),
                                                                                              alignment: _descriptor_15.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(0n),
                                                                                              alignment: _descriptor_3.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_15.toValue(4n),
                                                                                              alignment: _descriptor_15.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(0n),
                                                                                              alignment: _descriptor_3.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_15.toValue(5n),
                                                                                              alignment: _descriptor_15.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_15.toValue(6n),
                                                                                              alignment: _descriptor_15.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(0n),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_15.toValue(7n),
                                                                                              alignment: _descriptor_15.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(new Uint8Array(32)),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_15.toValue(8n),
                                                                                              alignment: _descriptor_15.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(new Uint8Array(32)),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    const tmp_0 = 1000000000000000000000000000n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_15.toValue(0n),
                                                                                              alignment: _descriptor_15.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(tmp_0),
                                                                                              alignment: _descriptor_5.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    const tmp_1 = 0n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_15.toValue(2n),
                                                                                              alignment: _descriptor_15.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(tmp_1),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    const tmp_2 = 0n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_15.toValue(3n),
                                                                                              alignment: _descriptor_15.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(tmp_2),
                                                                                              alignment: _descriptor_3.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    const tmp_3 = 0n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_15.toValue(4n),
                                                                                              alignment: _descriptor_15.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(tmp_3),
                                                                                              alignment: _descriptor_3.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_15.toValue(5n),
                                                                                              alignment: _descriptor_15.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    const tmp_4 = 1000n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_15.toValue(6n),
                                                                                              alignment: _descriptor_15.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(tmp_4),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_15.toValue(7n),
                                                                                              alignment: _descriptor_15.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(govAuth_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_15.toValue(8n),
                                                                                              alignment: _descriptor_15.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(stratAuth_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    state_0.data = new __compactRuntime.ChargedState(context.currentQueryContext.state.state);
    return {
      currentContractState: state_0,
      currentPrivateState: context.currentPrivateState,
      currentZswapLocalState: context.currentZswapLocalState
    }
  }
  _blockTimeLt_0(context, partialProofData, time_0) {
    return _descriptor_10.fromValue(__compactRuntime.queryLedgerState(context,
                                                                      partialProofData,
                                                                      [
                                                                       { dup: { n: 2 } },
                                                                       { idx: { cached: true,
                                                                                pushPath: false,
                                                                                path: [
                                                                                       { tag: 'value',
                                                                                         value: { value: _descriptor_15.toValue(2n),
                                                                                                  alignment: _descriptor_15.alignment() } }] } },
                                                                       { push: { storage: false,
                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(time_0),
                                                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                                                       'lt',
                                                                       { popeq: { cached: true,
                                                                                  result: undefined } }]).value);
  }
  _blockTimeGte_0(context, partialProofData, time_0) {
    return !this._blockTimeLt_0(context, partialProofData, time_0);
  }
  _persistentHash_0(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_9, value_0);
    return result_0;
  }
  _authSecret_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.authSecret(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(result_0.buffer instanceof ArrayBuffer && result_0.BYTES_PER_ELEMENT === 1 && result_0.length === 32)) {
      __compactRuntime.typeError('authSecret',
                                 'return value',
                                 'YieldEngine.compact line 96 char 1',
                                 'Bytes<32>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_0.toValue(result_0),
      alignment: _descriptor_0.alignment()
    });
    return result_0;
  }
  _authDigest_0(role_0, secret_0) {
    return this._persistentHash_0([role_0, secret_0]);
  }
  _assertGovernor_0(context, partialProofData) {
    __compactRuntime.assert(this._equal_0(this._authDigest_0(new Uint8Array([118, 105, 110, 99, 104, 105, 58, 103, 111, 118, 58, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                                             this._authSecret_0(context,
                                                                                partialProofData)),
                                          _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                    partialProofData,
                                                                                                    [
                                                                                                     { dup: { n: 0 } },
                                                                                                     { idx: { cached: false,
                                                                                                              pushPath: false,
                                                                                                              path: [
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_15.toValue(7n),
                                                                                                                                alignment: _descriptor_15.alignment() } }] } },
                                                                                                     { popeq: { cached: false,
                                                                                                                result: undefined } }]).value)),
                            'solo governor');
    return [];
  }
  _assertStrategist_0(context, partialProofData) {
    __compactRuntime.assert(this._equal_1(this._authDigest_0(new Uint8Array([118, 105, 110, 99, 104, 105, 58, 115, 116, 114, 97, 116, 58, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                                             this._authSecret_0(context,
                                                                                partialProofData)),
                                          _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                    partialProofData,
                                                                                                    [
                                                                                                     { dup: { n: 0 } },
                                                                                                     { idx: { cached: false,
                                                                                                              pushPath: false,
                                                                                                              path: [
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_15.toValue(8n),
                                                                                                                                alignment: _descriptor_15.alignment() } }] } },
                                                                                                     { popeq: { cached: false,
                                                                                                                result: undefined } }]).value)),
                            'solo strategist');
    return [];
  }
  _poner_a_rendir_0(context, partialProofData, data_0) {
    this._assertStrategist_0(context, partialProofData);
    const reportedAt_0 = data_0.reportedAt;
    const reportedYield_0 = data_0.reportedYield;
    const deployable_0 = data_0.deployable;
    __compactRuntime.assert(this._blockTimeGte_0(context,
                                                 partialProofData,
                                                 reportedAt_0),
                            'reporte con fecha futura');
    const buffer_0 = ((t1) => {
                       if (t1 > 340282366920938463463374607431768211455n) {
                         throw new __compactRuntime.CompactError('YieldEngine.compact line 154 char 18: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 340282366920938463463374607431768211455');
                       }
                       return t1;
                     })(this._checkedDiv_0(context,
                                           partialProofData,
                                           _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                     partialProofData,
                                                                                                     [
                                                                                                      { dup: { n: 0 } },
                                                                                                      { idx: { cached: false,
                                                                                                               pushPath: false,
                                                                                                               path: [
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_15.toValue(3n),
                                                                                                                                 alignment: _descriptor_15.alignment() } }] } },
                                                                                                      { popeq: { cached: false,
                                                                                                                 result: undefined } }]).value)
                                           *
                                           _descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                     partialProofData,
                                                                                                     [
                                                                                                      { dup: { n: 0 } },
                                                                                                      { idx: { cached: false,
                                                                                                               pushPath: false,
                                                                                                               path: [
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_15.toValue(6n),
                                                                                                                                 alignment: _descriptor_15.alignment() } }] } },
                                                                                                      { popeq: { cached: false,
                                                                                                                 result: undefined } }]).value),
                                           10000n));
    const idle_0 = this._satSub_0(_descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                            partialProofData,
                                                                                            [
                                                                                             { dup: { n: 0 } },
                                                                                             { idx: { cached: false,
                                                                                                      pushPath: false,
                                                                                                      path: [
                                                                                                             { tag: 'value',
                                                                                                               value: { value: _descriptor_15.toValue(3n),
                                                                                                                        alignment: _descriptor_15.alignment() } }] } },
                                                                                             { popeq: { cached: false,
                                                                                                        result: undefined } }]).value),
                                  _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                            partialProofData,
                                                                                            [
                                                                                             { dup: { n: 0 } },
                                                                                             { idx: { cached: false,
                                                                                                      pushPath: false,
                                                                                                      path: [
                                                                                                             { tag: 'value',
                                                                                                               value: { value: _descriptor_15.toValue(4n),
                                                                                                                        alignment: _descriptor_15.alignment() } }] } },
                                                                                             { popeq: { cached: false,
                                                                                                        result: undefined } }]).value));
    const available_0 = idle_0 > buffer_0 ?
                        (__compactRuntime.assert(idle_0 >= buffer_0,
                                                 'result of subtraction would be negative'),
                         idle_0 - buffer_0)
                        :
                        0n;
    const toDeploy_0 = deployable_0 < available_0 ? deployable_0 : available_0;
    if (_descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                  partialProofData,
                                                                  [
                                                                   { dup: { n: 0 } },
                                                                   { idx: { cached: false,
                                                                            pushPath: false,
                                                                            path: [
                                                                                   { tag: 'value',
                                                                                     value: { value: _descriptor_15.toValue(5n),
                                                                                              alignment: _descriptor_15.alignment() } }] } },
                                                                   { popeq: { cached: false,
                                                                              result: undefined } }]).value)
        ===
        0)
    {
      this._maybeCheckpoint_0(context, partialProofData, reportedAt_0);
    } else {
      const tmp_0 = ((t1) => {
                      if (t1 > 340282366920938463463374607431768211455n) {
                        throw new __compactRuntime.CompactError('YieldEngine.compact line 169 char 23: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 340282366920938463463374607431768211455');
                      }
                      return t1;
                    })(_descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                 partialProofData,
                                                                                 [
                                                                                  { dup: { n: 0 } },
                                                                                  { idx: { cached: false,
                                                                                           pushPath: false,
                                                                                           path: [
                                                                                                  { tag: 'value',
                                                                                                    value: { value: _descriptor_15.toValue(4n),
                                                                                                             alignment: _descriptor_15.alignment() } }] } },
                                                                                  { popeq: { cached: false,
                                                                                             result: undefined } }]).value)
                       +
                       toDeploy_0);
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_15.toValue(4n),
                                                                                                alignment: _descriptor_15.alignment() }).encode() } },
                                         { push: { storage: true,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(tmp_0),
                                                                                                alignment: _descriptor_3.alignment() }).encode() } },
                                         { ins: { cached: false, n: 1 } }]);
      this._applyYieldCapped_0(reportedYield_0, reportedAt_0);
      this._maybeCheckpoint_0(context, partialProofData, reportedAt_0);
    }
    return [];
  }
  _currentIndex_0(context, partialProofData) {
    return _descriptor_5.fromValue(__compactRuntime.queryLedgerState(context,
                                                                     partialProofData,
                                                                     [
                                                                      { dup: { n: 0 } },
                                                                      { idx: { cached: false,
                                                                               pushPath: false,
                                                                               path: [
                                                                                      { tag: 'value',
                                                                                        value: { value: _descriptor_15.toValue(0n),
                                                                                                 alignment: _descriptor_15.alignment() } }] } },
                                                                      { popeq: { cached: false,
                                                                                 result: undefined } }]).value);
  }
  _recordDeposit_0(context, partialProofData, amount_0) {
    this._assertStrategist_0(context, partialProofData);
    const tmp_0 = ((t1) => {
                    if (t1 > 340282366920938463463374607431768211455n) {
                      throw new __compactRuntime.CompactError('YieldEngine.compact line 183 char 21: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 340282366920938463463374607431768211455');
                    }
                    return t1;
                  })(_descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                               partialProofData,
                                                                               [
                                                                                { dup: { n: 0 } },
                                                                                { idx: { cached: false,
                                                                                         pushPath: false,
                                                                                         path: [
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_15.toValue(3n),
                                                                                                           alignment: _descriptor_15.alignment() } }] } },
                                                                                { popeq: { cached: false,
                                                                                           result: undefined } }]).value)
                     +
                     amount_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_15.toValue(3n),
                                                                                              alignment: _descriptor_15.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(tmp_0),
                                                                                              alignment: _descriptor_3.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    return [];
  }
  _recordWithdraw_0(context, partialProofData, amount_0) {
    this._assertStrategist_0(context, partialProofData);
    const pubAmount_0 = amount_0;
    const idle_0 = this._satSub_0(_descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                            partialProofData,
                                                                                            [
                                                                                             { dup: { n: 0 } },
                                                                                             { idx: { cached: false,
                                                                                                      pushPath: false,
                                                                                                      path: [
                                                                                                             { tag: 'value',
                                                                                                               value: { value: _descriptor_15.toValue(3n),
                                                                                                                        alignment: _descriptor_15.alignment() } }] } },
                                                                                             { popeq: { cached: false,
                                                                                                        result: undefined } }]).value),
                                  _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                            partialProofData,
                                                                                            [
                                                                                             { dup: { n: 0 } },
                                                                                             { idx: { cached: false,
                                                                                                      pushPath: false,
                                                                                                      path: [
                                                                                                             { tag: 'value',
                                                                                                               value: { value: _descriptor_15.toValue(4n),
                                                                                                                        alignment: _descriptor_15.alignment() } }] } },
                                                                                             { popeq: { cached: false,
                                                                                                        result: undefined } }]).value));
    __compactRuntime.assert(idle_0 >= pubAmount_0,
                            'liquidez insuficiente: replegue capital desplegado primero');
    let t_0;
    const tmp_0 = (t_0 = _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                   partialProofData,
                                                                                   [
                                                                                    { dup: { n: 0 } },
                                                                                    { idx: { cached: false,
                                                                                             pushPath: false,
                                                                                             path: [
                                                                                                    { tag: 'value',
                                                                                                      value: { value: _descriptor_15.toValue(3n),
                                                                                                               alignment: _descriptor_15.alignment() } }] } },
                                                                                    { popeq: { cached: false,
                                                                                               result: undefined } }]).value),
                   (__compactRuntime.assert(t_0 >= pubAmount_0,
                                            'result of subtraction would be negative'),
                    t_0 - pubAmount_0));
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_15.toValue(3n),
                                                                                              alignment: _descriptor_15.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(tmp_0),
                                                                                              alignment: _descriptor_3.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    return [];
  }
  _satSub_0(a_0, b_0) {
    if (a_0 > b_0) {
      __compactRuntime.assert(a_0 >= b_0,
                              'result of subtraction would be negative');
      return a_0 - b_0;
    } else {
      return 0n;
    }
  }
  _divHint_0(context, partialProofData, n_0, d_0) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.divHint(witnessContext_0,
                                                                  n_0,
                                                                  d_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(typeof(result_0) === 'bigint' && result_0 >= 0n && result_0 <= 22300745198530623141535718272648361505980415n)) {
      __compactRuntime.typeError('divHint',
                                 'return value',
                                 'YieldEngine.compact line 223 char 1',
                                 'Uint<0..22300745198530623141535718272648361505980416>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_6.toValue(result_0),
      alignment: _descriptor_6.alignment()
    });
    return result_0;
  }
  _checkedDiv_0(context, partialProofData, n_0, d_0) {
    __compactRuntime.assert(d_0 > 0n, 'division por cero');
    const q_0 = this._divHint_0(context, partialProofData, n_0, d_0);
    let t_0;
    __compactRuntime.assert((t_0 = q_0 * d_0, t_0 <= n_0),
                            'cociente demasiado grande');
    let t_1;
    __compactRuntime.assert((t_1 = n_0, t_1 < (q_0 + 1n) * d_0),
                            'cociente demasiado chico');
    return q_0;
  }
  _applyYieldCapped_0(reportedYield_0, reportedAt_0) {
    __compactRuntime.assert(this._equal_2(reportedYield_0, 0n),
                            'motor con rendimiento real: requiere presupuesto de bits para el indice');
    return [];
  }
  _maybeCheckpoint_0(context, partialProofData, nowTs_0) {
    if (nowTs_0
        >=
        ((t1) => {
          if (t1 > 18446744073709551615n) {
            throw new __compactRuntime.CompactError('YieldEngine.compact line 263 char 16: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
          }
          return t1;
        })(_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                     partialProofData,
                                                                     [
                                                                      { dup: { n: 0 } },
                                                                      { idx: { cached: false,
                                                                               pushPath: false,
                                                                               path: [
                                                                                      { tag: 'value',
                                                                                        value: { value: _descriptor_15.toValue(2n),
                                                                                                 alignment: _descriptor_15.alignment() } }] } },
                                                                      { popeq: { cached: false,
                                                                                 result: undefined } }]).value)
           +
           3600n))
    {
      const leaf_0 = this._persistentHash_0([__compactRuntime.convertFieldToBytes(32,
                                                                                  nowTs_0,
                                                                                  'YieldEngine.compact line 265 char 7'),
                                             __compactRuntime.convertFieldToBytes(32,
                                                                                  _descriptor_5.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                                            partialProofData,
                                                                                                                                            [
                                                                                                                                             { dup: { n: 0 } },
                                                                                                                                             { idx: { cached: false,
                                                                                                                                                      pushPath: false,
                                                                                                                                                      path: [
                                                                                                                                                             { tag: 'value',
                                                                                                                                                               value: { value: _descriptor_15.toValue(0n),
                                                                                                                                                                        alignment: _descriptor_15.alignment() } }] } },
                                                                                                                                             { popeq: { cached: false,
                                                                                                                                                        result: undefined } }]).value),
                                                                                  'YieldEngine.compact line 266 char 7')]);
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { idx: { cached: false,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_15.toValue(1n),
                                                                    alignment: _descriptor_15.alignment() } }] } },
                                         { idx: { cached: false,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_15.toValue(0n),
                                                                    alignment: _descriptor_15.alignment() } }] } },
                                         { dup: { n: 2 } },
                                         { idx: { cached: false,
                                                  pushPath: false,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_15.toValue(1n),
                                                                    alignment: _descriptor_15.alignment() } }] } },
                                         { push: { storage: true,
                                                   value: __compactRuntime.StateValue.newCell(__compactRuntime.leafHash(
                                                                                                { value: _descriptor_0.toValue(leaf_0),
                                                                                                  alignment: _descriptor_0.alignment() }
                                                                                              )).encode() } },
                                         { ins: { cached: false, n: 1 } },
                                         { ins: { cached: true, n: 1 } },
                                         { idx: { cached: false,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_15.toValue(1n),
                                                                    alignment: _descriptor_15.alignment() } }] } },
                                         { addi: { immediate: 1 } },
                                         { ins: { cached: true, n: 2 } }]);
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_15.toValue(2n),
                                                                                                alignment: _descriptor_15.alignment() }).encode() } },
                                         { push: { storage: true,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(nowTs_0),
                                                                                                alignment: _descriptor_4.alignment() }).encode() } },
                                         { ins: { cached: false, n: 1 } }]);
    }
    return [];
  }
  _setEngine_0(context, partialProofData, newEngine_0) {
    this._assertGovernor_0(context, partialProofData);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_15.toValue(5n),
                                                                                              alignment: _descriptor_15.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(newEngine_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    return [];
  }
  _setBufferBps_0(context, partialProofData, newBufferBps_0) {
    this._assertGovernor_0(context, partialProofData);
    const pubBuffer_0 = newBufferBps_0;
    __compactRuntime.assert(pubBuffer_0 <= 5000n, 'buffer max 50%');
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_15.toValue(6n),
                                                                                              alignment: _descriptor_15.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(pubBuffer_0),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    return [];
  }
  _setStrategist_0(context, partialProofData, newStrategistAuth_0) {
    this._assertGovernor_0(context, partialProofData);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_15.toValue(8n),
                                                                                              alignment: _descriptor_15.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(newStrategistAuth_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    return [];
  }
  _equal_0(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_1(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_2(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
}
export function ledger(stateOrChargedState) {
  const state = stateOrChargedState instanceof __compactRuntime.StateValue ? stateOrChargedState : stateOrChargedState.state;
  const chargedState = stateOrChargedState instanceof __compactRuntime.StateValue ? new __compactRuntime.ChargedState(stateOrChargedState) : stateOrChargedState;
  const context = {
    currentQueryContext: new __compactRuntime.QueryContext(chargedState, __compactRuntime.dummyContractAddress()),
    costModel: __compactRuntime.CostModel.initialCostModel()
  };
  const partialProofData = {
    input: { value: [], alignment: [] },
    output: undefined,
    publicTranscript: [],
    privateTranscriptOutputs: []
  };
  return {
    get yieldIndex() {
      return _descriptor_5.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_15.toValue(0n),
                                                                                                   alignment: _descriptor_15.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    indexCheckpoints: {
      isFull(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isFull: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_10.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_15.toValue(1n),
                                                                                                      alignment: _descriptor_15.alignment() } }] } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_15.toValue(1n),
                                                                                                      alignment: _descriptor_15.alignment() } }] } },
                                                                           { push: { storage: false,
                                                                                     value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(65536n),
                                                                                                                                  alignment: _descriptor_4.alignment() }).encode() } },
                                                                           'lt',
                                                                           'neg',
                                                                           { popeq: { cached: true,
                                                                                      result: undefined } }]).value);
      },
      checkRoot(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`checkRoot: expected 1 argument, received ${args_0.length}`);
        }
        const rt_0 = args_0[0];
        if (!(typeof(rt_0) === 'object' && typeof(rt_0.field) === 'bigint' && rt_0.field >= 0 && rt_0.field <= __compactRuntime.MAX_FIELD)) {
          __compactRuntime.typeError('checkRoot',
                                     'argument 1',
                                     'YieldEngine.compact line 68 char 1',
                                     'struct MerkleTreeDigest<field: Field>',
                                     rt_0)
        }
        return _descriptor_10.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_15.toValue(1n),
                                                                                                      alignment: _descriptor_15.alignment() } }] } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_15.toValue(0n),
                                                                                                      alignment: _descriptor_15.alignment() } }] } },
                                                                           'root',
                                                                           { push: { storage: false,
                                                                                     value: __compactRuntime.StateValue.newCell({ value: _descriptor_14.toValue(rt_0),
                                                                                                                                  alignment: _descriptor_14.alignment() }).encode() } },
                                                                           'eq',
                                                                           { popeq: { cached: true,
                                                                                      result: undefined } }]).value);
      },
      root(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`root: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[1];
        return ((result) => result             ? __compactRuntime.CompactTypeMerkleTreeDigest.fromValue(result)             : undefined)(self_0.asArray()[0].asBoundedMerkleTree().rehash().root()?.value);
      },
      firstFree(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`first_free: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[1];
        return __compactRuntime.CompactTypeField.fromValue(self_0.asArray()[1].asCell().value);
      },
      pathForLeaf(...args_0) {
        if (args_0.length !== 2) {
          throw new __compactRuntime.CompactError(`path_for_leaf: expected 2 arguments, received ${args_0.length}`);
        }
        const index_0 = args_0[0];
        const leaf_0 = args_0[1];
        if (!(typeof(index_0) === 'bigint' && index_0 >= 0 && index_0 <= __compactRuntime.MAX_FIELD)) {
          __compactRuntime.typeError('path_for_leaf',
                                     'argument 1',
                                     'YieldEngine.compact line 68 char 1',
                                     'Field',
                                     index_0)
        }
        if (!(leaf_0.buffer instanceof ArrayBuffer && leaf_0.BYTES_PER_ELEMENT === 1 && leaf_0.length === 32)) {
          __compactRuntime.typeError('path_for_leaf',
                                     'argument 2',
                                     'YieldEngine.compact line 68 char 1',
                                     'Bytes<32>',
                                     leaf_0)
        }
        const self_0 = state.asArray()[1];
        return ((result) => result             ? new __compactRuntime.CompactTypeMerkleTreePath(16, _descriptor_0).fromValue(result)             : undefined)(  self_0.asArray()[0].asBoundedMerkleTree().rehash().pathForLeaf(    index_0,    {      value: _descriptor_0.toValue(leaf_0),      alignment: _descriptor_0.alignment()    }  )?.value);
      },
      findPathForLeaf(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`find_path_for_leaf: expected 1 argument, received ${args_0.length}`);
        }
        const leaf_0 = args_0[0];
        if (!(leaf_0.buffer instanceof ArrayBuffer && leaf_0.BYTES_PER_ELEMENT === 1 && leaf_0.length === 32)) {
          __compactRuntime.typeError('find_path_for_leaf',
                                     'argument 1',
                                     'YieldEngine.compact line 68 char 1',
                                     'Bytes<32>',
                                     leaf_0)
        }
        const self_0 = state.asArray()[1];
        return ((result) => result             ? new __compactRuntime.CompactTypeMerkleTreePath(16, _descriptor_0).fromValue(result)             : undefined)(  self_0.asArray()[0].asBoundedMerkleTree().rehash().findPathForLeaf(    {      value: _descriptor_0.toValue(leaf_0),      alignment: _descriptor_0.alignment()    }  )?.value);
      }
    },
    get lastCheckpointAt() {
      return _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_15.toValue(2n),
                                                                                                   alignment: _descriptor_15.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get totalCollateral() {
      return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_15.toValue(3n),
                                                                                                   alignment: _descriptor_15.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get deployedCapital() {
      return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_15.toValue(4n),
                                                                                                   alignment: _descriptor_15.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get activeEngine() {
      return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_15.toValue(5n),
                                                                                                   alignment: _descriptor_15.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get bufferBps() {
      return _descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_15.toValue(6n),
                                                                                                   alignment: _descriptor_15.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get governorAuth() {
      return _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_15.toValue(7n),
                                                                                                   alignment: _descriptor_15.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get strategistAuth() {
      return _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_15.toValue(8n),
                                                                                                   alignment: _descriptor_15.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    }
  };
}
const _emptyContext = {
  currentQueryContext: new __compactRuntime.QueryContext(new __compactRuntime.ContractState().data, __compactRuntime.dummyContractAddress())
};
const _dummyContract = new Contract({
  authSecret: (...args) => undefined, divHint: (...args) => undefined
});
export const pureCircuits = {};
export const contractReferenceLocations =
  { tag: 'publicLedgerArray', indices: { } };
//# sourceMappingURL=index.js.map
