import { Injectable } from '@nestjs/common';
import { BIP32API, BIP32Factory } from 'bip32';
import * as ecc from 'tiny-secp256k1';
import {
    isSearchBySentFromOrToQuery,
    SearchTxFilter,
    SearchTxQuery,
    StargateClient,
} from '@cosmjs/stargate';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const bip39 = require('bip39');

import { toBase64, Bech32 } from '@cosmjs/encoding';
import { makeCosmoshubPath } from '@cosmjs/amino';

import {
    DirectSecp256k1HdWallet,
    OfflineDirectSigner,
    Registry,
} from '@cosmjs/proto-signing';
import {
    assertIsDeliverTxSuccess,
    Coin,
    coin,
    coins,
    DeliverTxResponse,
    logs,
    SigningStargateClient,
    StdFee,
    calculateFee,
    GasPrice,
    isDeliverTxFailure,
    isDeliverTxSuccess,
} from '@cosmjs/stargate';
import {
    MsgExecuteContractEncodeObject,
    MsgStoreCodeEncodeObject,
    SigningCosmWasmClient,
    SigningCosmWasmClientOptions,
    MsgInstantiateContractEncodeObject,
    CosmWasmClient,
} from '@cosmjs/cosmwasm-stargate';
import {
    MsgClearAdmin,
    MsgExecuteContract,
    MsgInstantiateContract,
    MsgMigrateContract,
    MsgStoreCode,
    MsgUpdateAdmin,
} from 'cosmjs-types/cosmwasm/wasm/v1/tx';
import Long from 'long';
import { fromAscii, fromHex, toAscii, toHex } from '@cosmjs/encoding';
import { fromBase64 } from '@cosmjs/encoding';
// eslint-disable-next-line @typescript-eslint/no-var-requires
import * as hackatom from './contract.json';

// import {
//     MsgStoreCodeEncodeObject,
//     SigningAuraWasmClient,
//     MsgInstantiateContractEncodeObject,
//     AuraWasmClient,
// } from '@auranw/aurajs';
import { sleep } from '@cosmjs/utils';
import { Random } from '@cosmjs/crypto';

const fs = require('fs');

export interface ContractUploadInstructions {
    /** The wasm bytecode */
    readonly data: Uint8Array;
}

@Injectable()
export class AppService {
    //hard code user
    alice = {
        mnemonic:
            'fox undo purpose tip secret whisper almost bulk casual avocado wife swallow',
        pubkey0: {
            type: 'tendermint/PubKeySecp256k1',
            value: 'A3CfC3eCFpd6CGjk0yynBxWx7nGrcTcsX5AXZirTyHPj',
        },
        address0: 'aura1nzrfafqxs8tz3guzx3j3z64dp7nuvyzhw967ha',
        address1: 'aura1ylee4pzmvmknzg6n37nfeadrx5k9tx9qv8d57e',
    };

    //point to testnet aurad
    // wasmd = {
    //     blockTime: 1_000, // ms
    //     chainId: 'aura-testnet',
    //     endpoint: 'https://tendermint-testnet.aura.network/',
    //     prefix: 'aura',
    // };

    //point to localhost aurad
    wasmd = {
        blockTime: 1_000, // ms
        chainId: 'aura-testnet',
        endpoint: 'http://0.0.0.0:26657',
        prefix: 'aura',
    };

    defaultSigningClientOptions = {
        broadcastPollIntervalMs: 200,
        broadcastTimeoutMs: 10_000,
    };
    defaultGasPrice = GasPrice.fromString('0.025uaura');
    defaultSendFee = calculateFee(100_000, this.defaultGasPrice);
    defaultUploadFee = calculateFee(1_500_000, this.defaultGasPrice);
    flowerContract;
    constructor() {
        const wasmBuffer = fs.readFileSync('./src/flower_store.wasm');
        this.flowerContract = new Uint8Array(wasmBuffer);
        this.testFlowInteractingContract();

        // this.generateMnemonic();
        // this.createAccount();
        // this.getAccountDetail();
        // this.testUploadContract();
        // this.testInstantiateContract();
        // this.queryContract();

        // this.testExecuteContract();
        // this.getTx();
        // this.testPollTx();
    }
    async generateMnemonic() {
        let mnemonic = bip39.generateMnemonic();
        // let mnemonic =
        //     'rich poverty old cart robot shine bus impulse major sniff pride frozen';
        console.log('mnemonic: ', mnemonic);
        //generate seed from mnemonic
        let seed = bip39.mnemonicToSeedSync(mnemonic);
        //get master key from seed
        const bip32 = BIP32Factory(ecc);
        let masterKey = bip32.fromSeed(seed);

        this.createChildKey(masterKey, 0);
        this.createChildKey(masterKey, 1);
    }

    async createChildKey(masterKey, addressIndex) {
        console.log('---------------------');
        let path = `m/44'/118'/0'/0/${addressIndex}`;
        // let path = makeCosmoshubPath(addressIndex);
        console.log('path: ', path);
        let hd = masterKey.derivePath(path);
        //get private key
        const privateKey = hd.privateKey;
        if (!privateKey) {
            console.log('null hd key');
        }
        console.log('privateKey: ', toBase64(privateKey));
        //get public key
        const publicKey = hd.publicKey;
        console.log('publicKey: ', toBase64(publicKey));
    }

    async createAccount() {
        let mnemonic =
            'fox undo purpose tip secret whisper almost bulk casual avocado wife swallow';
        const path = makeCosmoshubPath(0);
        const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
            prefix: 'aura',
            hdPaths: [path],
        });
        console.log('wallet account: ', await wallet.getAccounts());
    }
    async uploadContract(
        signer: OfflineDirectSigner,
        contract: ContractUploadInstructions,
    ) {
        const memo = 'My first contract on chain';
        const theMsg: MsgStoreCodeEncodeObject = {
            typeUrl: '/cosmwasm.wasm.v1.MsgStoreCode',
            // typeUrl: '/auranw.aura.wasm.MsgStoreCode',
            value: MsgStoreCode.fromPartial({
                sender: this.alice.address0,
                wasmByteCode: contract.data,
            }),
        };
        const fee: StdFee = {
            amount: coins(50000, 'uaura'),
            gas: '30000000',
        };
        const firstAddress = (await signer.getAccounts())[0].address;
        let defaultSigningClientOptions = {
            // broadcastPollIntervalMs: 300,
            // broadcastTimeoutMs: 8_000,
        };
        const registry = new Registry([
            ['/auranw.aura.wasm.MsgStoreCode', MsgStoreCode],
        ]);
        const client = await SigningCosmWasmClient.connectWithSigner(
            'https://tendermint-testnet.aura.network/',
            signer,
            {
                registry,
            },
        );
        // type 1
        // return client.signAndBroadcast(firstAddress, [theMsg], fee, memo);

        // type 2
        let result = await client.upload(
            this.alice.address0,
            contract.data,
            fee,
        );
        return result;
    }
    async instantiateContract(
        signer: OfflineDirectSigner,
        codeId: number,
        beneficiaryAddress: string,
        funds?: readonly Coin[],
    ) {
        const registry = new Registry([
            ['/auranw.aura.wasm.MsgExecuteContract', MsgExecuteContract],
            ['/auranw.aura.wasm.MsgStoreCode', MsgStoreCode],
            [
                '/auranw.aura.wasm.MsgInstantiateContract',
                MsgInstantiateContract,
            ],
        ]);
        const memo = 'Create an escrow instance';
        const theMsg: MsgInstantiateContractEncodeObject = {
            typeUrl: '/cosmwasm.wasm.v1.MsgInstantiateContract',
            // typeUrl: '/auranw.aura.wasm.MsgInstantiateContract',
            value: MsgInstantiateContract.fromPartial({
                sender: this.alice.address0,
                codeId: codeId,
                label: 'my escrow',
                msg: toAscii(
                    JSON.stringify({
                        verifier: this.alice.address0,
                        beneficiary: beneficiaryAddress,
                    }),
                ),
                funds: funds ? [...funds] : [],
            }),
        };
        const fee: StdFee = {
            amount: coins(50000, 'uaura'),
            gas: '30000000',
        };

        const firstAddress = (await signer.getAccounts())[0].address;
        let defaultSigningClientOptions = {
            broadcastPollIntervalMs: 300,
            broadcastTimeoutMs: 8_000,
        };
        const client = await SigningCosmWasmClient.connectWithSigner(
            'https://tendermint-testnet.aura.network/',
            signer,
            {
                ...defaultSigningClientOptions,
                registry,
            },
        );

        // return client.signAndBroadcast(firstAddress, [theMsg], fee, memo);

        return client.instantiate(
            firstAddress,
            codeId,
            {
                verifier: this.alice.address0,
                beneficiary: beneficiaryAddress,
            },
            'my cool label',
            fee,
        );
    }

    async testUploadContract() {
        const wallet = await DirectSecp256k1HdWallet.fromMnemonic(
            this.alice.mnemonic,
            { prefix: this.wasmd.prefix },
        );
        const options = {
            ...this.defaultSigningClientOptions,
            prefix: this.wasmd.prefix,
        };
        const result = await this.uploadContract(wallet, this.getHackatom());
        // const result = await this.uploadContract(wallet, this.getFlower());
        // const client = await SigningCosmWasmClient.connectWithSigner(
        //     'http://34.199.79.132:26657',
        //     wallet,
        //     options,
        // );

        // const { codeId } = await client.upload(
        //     this.alice.address0,
        //     this.getHackatom().data,
        //     this.defaultUploadFee,
        // );
        console.log('upload contract result: ', result);
    }

    async testInstantiateContract() {
        const wallet = await DirectSecp256k1HdWallet.fromMnemonic(
            this.alice.mnemonic,
            { prefix: this.wasmd.prefix },
        );
        let codeId = 19;
        const options = {
            ...this.defaultSigningClientOptions,
            prefix: this.wasmd.prefix,
        };
        const beneficiaryAddress = this.alice.address1;
        const result = await this.instantiateContract(
            wallet,
            codeId,
            beneficiaryAddress,
        );
        console.log('instantiate contract result: ', result);
    }

    async testExecuteContract() {
        const defaultGasPrice = GasPrice.fromString('0.0002uaura');
        const contract = this.getHackatom();
        const defaultExecuteFee = calculateFee(2_000_000, defaultGasPrice);
        const defaultInstantiateFee = calculateFee(800_000, defaultGasPrice);
        const defaultUploadFee = calculateFee(800_000, defaultGasPrice);

        const wallet = await DirectSecp256k1HdWallet.fromMnemonic(
            this.alice.mnemonic,
            { prefix: this.wasmd.prefix },
        );
        const options = {
            ...this.defaultSigningClientOptions,
            prefix: this.wasmd.prefix,
            gasPrice: defaultGasPrice,
        };
        const beneficiaryAddress = this.alice.address1;

        const client = await SigningCosmWasmClient.connectWithSigner(
            this.wasmd.endpoint,
            wallet,
            options,
        );
        console.log('flower contract: ', this.flowerContract);
        console.log(
            'balance: ',
            await client.getBalance(this.alice.address0, 'uaura'),
        );
        const funds = [coin(233444, 'uaura')];
        let codeId;
        let txId;
        let resultUpload;
        console.log('Uploading contract...');
        try {
            // resultUpload = await client.upload(
            //     this.alice.address0,
            //     contract.data,
            //     'auto',
            // );
            resultUpload = await client.upload(
                this.alice.address0,
                this.flowerContract,
                'auto',
            );
            txId = resultUpload.transactionHash;
            console.log('tx upload complete here');
        } catch (error) {
            console.log(error);
            resultUpload = error;
            txId = error.txId;
            console.log('tx upload timeout');
        }
        await sleep(1000);
        console.log('txId: ', txId);
        let tx = await this.pollForTx(client, txId);
        console.log('Transaction upload:', tx);
        let parsedLogs = logs.parseRawLog(tx.rawLog);
        let logDetail = logs.findAttribute(parsedLogs, 'store_code', 'code_id');
        codeId = logDetail.value;
        console.log('CodeId: ', Number(codeId));
        let resultInstantiate;
        txId = null;
        tx = null;
        parsedLogs = null;
        logDetail = null;
        console.log('-------------------------');
        console.log('Instantiating contract...');
        try {
            // resultInstantiate = await client.instantiate(
            //     this.alice.address0,
            //     Number(codeId),
            //     {
            //         verifier: this.alice.address0,
            //         beneficiary: beneficiaryAddress,
            //     },
            //     'amazing random contract',
            //     defaultInstantiateFee,
            //     {
            //         funds: funds,
            //     },
            // );
            resultInstantiate = await client.instantiate(
                this.alice.address0,
                Number(codeId),
                {
                    name: 'init-flower',
                    amount: 0,
                    price: 0,
                },
                'amazing random contract',
                'auto',
                {
                    funds: funds,
                },
            );
            console.log('tx instantiate complete here');
            txId = resultInstantiate.transactionHash;
        } catch (error) {
            resultInstantiate = error;
            console.log('tx instantiate timeout');
            txId = resultInstantiate.txId;
        }
        console.log('txId: ', txId);
        tx = await this.pollForTx(client, txId);
        console.log('Transaction instantiate: ', tx);
        parsedLogs = logs.parseRawLog(tx.rawLog);
        // logDetail = logs.findAttribute(parsedLogs, 'wasm', '_contract_address');
        logDetail = logs.findAttribute(
            parsedLogs,
            'instantiate',
            '_contract_address',
        );
        console.log('Contract address: ', logDetail.value);
        let contractAddress = logDetail.value;
        console.log('-------------------------');
        console.log('Executing contract add new...');
        let resultExecute;
        txId = null;
        try {
            // resultExecute = await client.execute(
            //     this.alice.address0,
            //     contractAddress,
            //     { release: {} },
            //     defaultExecuteFee,
            // );
            resultExecute = await client.execute(
                this.alice.address0,
                contractAddress,
                {
                    add_new: {
                        id: 'f1',
                        name: 'rose',
                        amount: 150,
                        price: 100,
                    },
                },
                'auto',
            );
            console.log('tx instantiate complete here');
            txId = resultExecute.transactionHash;
        } catch (error) {
            console.log('tx execute timeout');
            resultExecute = error;
            txId = resultExecute.txId;
        }
        console.log('txId: ', txId);
        tx = await this.pollForTx(client, txId);
        console.log('Transaction execute: ', tx);
        console.log('Executing contract sell...');
        resultExecute;
        txId = null;
        try {
            // resultExecute = await client.execute(
            //     this.alice.address0,
            //     contractAddress,
            //     { release: {} },
            //     defaultExecuteFee,
            // );
            resultExecute = await client.execute(
                this.alice.address0,
                contractAddress,
                {
                    sell: {
                        id: 'f1',
                        amount: 1,
                    },
                },
                'auto',
            );
            console.log('tx instantiate complete here');
            txId = resultExecute.transactionHash;
        } catch (error) {
            console.log('tx execute timeout');
            resultExecute = error;
            txId = resultExecute.txId;
        }
        console.log('txId: ', txId);
        tx = await this.pollForTx(client, txId);
        console.log('Transaction execute: ', tx);

        console.log('-------------------------');
        console.log('Query contract...');
        let contractOnchain = await client.getContract(contractAddress);
        console.log('Contract onchain: ', contractOnchain);
        let resultQuery = await client.queryContractSmart(contractAddress, {
            get_flower: { id: 'f1' },
        });
        console.log('Query result: ', resultQuery);
    }

    async testFlowInteractingContract() {
        const defaultGasPrice = GasPrice.fromString('0.0002uaura');

        const wallet = await DirectSecp256k1HdWallet.fromMnemonic(
            this.alice.mnemonic,
            { prefix: this.wasmd.prefix },
        );
        const options = {
            ...this.defaultSigningClientOptions,
            prefix: this.wasmd.prefix,
            gasPrice: defaultGasPrice,
        };

        const client = await SigningCosmWasmClient.connectWithSigner(
            this.wasmd.endpoint,
            wallet,
            options,
        );

        let codeId;
        let txId;
        let resultUpload;
        console.log('Uploading contract...');
        try {
            // resultUpload = await client.upload(
            //     this.alice.address0,
            //     contract.data,
            //     'auto',
            // );
            resultUpload = await client.upload(
                this.alice.address0,
                this.flowerContract,
                'auto',
            );
            txId = resultUpload.transactionHash;
            console.log('tx upload complete here');
        } catch (error) {
            console.log(error);
            resultUpload = error;
            txId = error.txId;
            console.log('tx upload timeout');
        }
        await sleep(1000);
        console.log('txId: ', txId);
        let tx = await this.pollForTx(client, txId);
        console.log('Transaction upload:', tx);
        let parsedLogs = logs.parseRawLog(tx.rawLog);
        let logDetail = logs.findAttribute(parsedLogs, 'store_code', 'code_id');
        codeId = logDetail.value;
        console.log('CodeId: ', Number(codeId));
        let resultInstantiate;
        txId = null;
        tx = null;
        parsedLogs = null;
        logDetail = null;
        console.log('-------------------------');
        console.log('Instantiating contract...');

        //amount token will be sent to smart contract
        const funds = [coin(233444, 'uaura')];

        try {
            resultInstantiate = await client.instantiate(
                this.alice.address0,
                Number(codeId),
                {
                    name: 'init-flower',
                    amount: 0,
                    price: 0,
                },
                'amazing random contract',
                'auto',
                {
                    funds: funds,
                },
            );
            console.log('tx instantiate complete here');
            txId = resultInstantiate.transactionHash;
        } catch (error) {
            resultInstantiate = error;
            console.log('tx instantiate timeout');
            txId = resultInstantiate.txId;
        }
        console.log('txId: ', txId);
        tx = await this.pollForTx(client, txId);
        console.log('Transaction instantiate: ', tx);
        parsedLogs = logs.parseRawLog(tx.rawLog);
        // logDetail = logs.findAttribute(parsedLogs, 'wasm', '_contract_address');
        logDetail = logs.findAttribute(
            parsedLogs,
            'instantiate',
            '_contract_address',
        );
        console.log('Contract address: ', logDetail.value);
        let contractAddress = logDetail.value;
        console.log('-------------------------');
        console.log('Executing contract add new...');
        let resultExecute;
        txId = null;
        try {
            resultExecute = await client.execute(
                this.alice.address0,
                contractAddress,
                {
                    add_new: {
                        id: 'f1',
                        name: 'rose',
                        amount: 150,
                        price: 100,
                    },
                },
                'auto',
            );
            console.log('tx instantiate complete here');
            txId = resultExecute.transactionHash;
        } catch (error) {
            console.log('tx execute timeout');
            resultExecute = error;
            txId = resultExecute.txId;
        }
        console.log('txId: ', txId);
        tx = await this.pollForTx(client, txId);
        console.log('Transaction execute: ', tx);
        console.log('Executing contract sell...');
        resultExecute = null;
        txId = null;
        try {
            resultExecute = await client.execute(
                this.alice.address0,
                contractAddress,
                {
                    sell: {
                        id: 'f1',
                        amount: 1,
                    },
                },
                'auto',
            );
            console.log('tx instantiate complete here');
            txId = resultExecute.transactionHash;
        } catch (error) {
            console.log('tx execute timeout');
            resultExecute = error;
            txId = resultExecute.txId;
        }
        console.log('txId: ', txId);
        tx = await this.pollForTx(client, txId);
        console.log('Transaction execute: ', tx);
        console.log('-------------------------');
        console.log('Query contract...');
        let contractOnchain = await client.getContract(contractAddress);
        console.log('Contract onchain: ', contractOnchain);
        let resultQuery = await client.queryContractSmart(contractAddress, {
            get_flower: { id: 'f1' },
        });
        console.log('Query result: ', resultQuery);
    }

    async queryContract() {
        try {
            console.log('-------------------------');
            console.log('Query contract...');
            const client = await CosmWasmClient.connect(
                'https://tendermint-testnet.aura.network/',
            );
            let contractByAddress = await client.getContract(
                'aura14hj2tavq8fpesdwxxcu44rty3hh90vhurzxerr',
            );
            console.log('Contract by address: ', contractByAddress);
            let contractById = await client.getContracts(54);
            console.log('Contract by id: ', contractById);
            let resultQuery = await client.queryContractSmart(
                'aura12q6jynhpp27yzny0dyzfvaj2qwee0yshsp8ex4',
                {
                    get_flower: { id: 'f1' },
                },
            );
            console.log('Query result: ', resultQuery);
        } catch (error) {
            console.log('error ', error);
        }
    }

    async pollForTx(client: any, txId: string): Promise<DeliverTxResponse> {
        console.log('polling');
        await sleep(1000);

        const result = await client.getTx(txId);
        console.log('result ', result);
        return result
            ? {
                  code: result.code,
                  height: result.height,
                  rawLog: result.rawLog,
                  transactionHash: txId,
                  gasUsed: result.gasUsed,
                  gasWanted: result.gasWanted,
              }
            : this.pollForTx(client, txId);
    }

    async getAccountDetail() {
        const randomAccount = this.makeRandomAddress();
        console.log('randomAccount: ', randomAccount);
        const client = await CosmWasmClient.connect(
            'https://tendermint-testnet.aura.network/',
        );
        const result = await client.getAccount(
            'aura1kluqdpr30r2xl60z7nmruc6nw0xmqtqsdqf02a',
        );
        console.log('Account detail: ', result);
    }

    async getTx() {
        let address = 'aura15f6wn3nymdnhnh5ddlqletuptjag09tryrtpq5';
        const query: SearchTxQuery = {
            // height: 930386,
            sentFromOrTo: address,
        };
        console.log(query);
        const filter: SearchTxFilter = {
            minHeight: 930760,
            maxHeight: 1000000,
        };
        console.log(filter);
        const client = await StargateClient.connect(
            'https://tendermint-testnet.aura.network',
        );
        const res = await client.searchTx(query, filter);
        console.log(res);
    }

    async testPollTx() {
        const wallet = await DirectSecp256k1HdWallet.fromMnemonic(
            this.alice.mnemonic,
            { prefix: this.wasmd.prefix },
        );
        const options = {
            ...this.defaultSigningClientOptions,
            prefix: this.wasmd.prefix,
            gasPrice: this.defaultGasPrice,
        };
        const beneficiaryAddress = this.alice.address1;

        const client = await SigningCosmWasmClient.connectWithSigner(
            this.wasmd.endpoint,
            wallet,
            options,
        );
        let result = await this.pollForTx(
            client,
            'CD9D0FA929841031BF9736C7A65F9F0C6C6B4D87C71C8379D4188EFEF157ABE7',
        );
        console.log(result);
    }

    getHackatom(): ContractUploadInstructions {
        return {
            data: fromBase64(hackatom.data),
        };
    }

    makeRandomAddress(): string {
        return Bech32.encode('aura', Random.getBytes(20));
    }
    getFlower(): ContractUploadInstructions {
        return {
            data: this.flowerContract,
        };
    }
    getHello(): string {
        console.log(hackatom);
        return 'Hello World!';
    }
}
