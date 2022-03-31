import { Injectable } from '@nestjs/common';
import { Wallet, Client } from '@bandprotocol/bandchain.js';
const { PrivateKey } = Wallet;
import { sleep } from '@cosmjs/utils';
import {
    Obi,
    Message,
    Coin,
    Fee,
    Transaction,
} from '@bandprotocol/bandchain.js';
import {
    MsgCreateDataSource,
    MsgCreateOracleScript,
} from '@bandprotocol/bandchain.js/lib/message';

const fs = require('fs');
@Injectable()
export class BandService {
    endpoint = 'https://laozi-testnet4.bandchain.org/grpc-web';
    client = new Client(this.endpoint);
    constructor() {
        // console.log(123);
        // sleep(1000);
        // console.log(456);
        // this.exampleGetReferenceData();
        // this.testBand();
        // this.createDataSource();
        this.createOracleScript();
    }
    async exampleGetReferenceData() {
        const rate = await this.client.getReferenceData(
            ['BTC/USD', 'BTC/ETH', 'EUR/USD', 'EUR/ETH'],
            3,
            4,
        );
        console.log(rate);
        // return rate;
    }
    async testBand() {
        const privkey = PrivateKey.fromMnemonic(
            'subject economy equal whisper turn boil guard giraffe stick retreat wealth card only buddy joy leave genuine resemble submit ghost top polar adjust avoid',
        );
        const pubkey = privkey.toPubkey();
        console.log('address:', pubkey.toAddress().toAccBech32());
        const sender = pubkey.toAddress().toAccBech32();
        // const obi = new Obi('{symbols:[string],multiplier:u64}/{rates:[u64]}');
        // const calldata = obi.encodeInput({ symbols: ['ETH'], multiplier: 100 });
        const obi = new Obi('{symbols:[string],multiplier:u64}/{rates:[u64]}');
        console.log(Date.now());
        // const calldata = obi.encodeInput({
        //     seed: 'scaleremembernorthdeleteneighborhood',
        //     time: Date.now(),
        // });
        const calldata = obi.encodeInput({
            symbols: ['ETH'],
            multiplier: 100,
        });
        // 55, 57, 68 not work
        const oracleScriptId = 68;

        const askCount = 7;
        const minCount = 4;
        const clientId = 'from_bandchain.js';

        let feeLimit = new Coin();
        feeLimit.setDenom('uband');
        feeLimit.setAmount('100000');

        const prepareGas = 100000;
        const executeGas = 200000;

        const requestMessage = new Message.MsgRequestData(
            oracleScriptId,
            calldata,
            askCount,
            minCount,
            clientId,
            sender,
            [feeLimit],
            prepareGas,
            executeGas,
        );
        this.client.getReferenceData;
        let feeCoin = new Coin();
        feeCoin.setDenom('uband');
        feeCoin.setAmount('50000');

        const fee = new Fee();
        fee.setAmountList([feeCoin]);
        fee.setGasLimit(1000000);

        const chainId = await this.client.getChainId();
        console.log(chainId);
        console.log(await this.client.getOracleScript(oracleScriptId));
        const txn = new Transaction();
        txn.withMessages(requestMessage);
        await txn.withSender(this.client, sender);
        txn.withChainId(chainId);
        txn.withFee(fee);
        txn.withMemo('');
        const signDoc = txn.getSignDoc(pubkey);
        const signature = privkey.sign(signDoc);
        const txRawBytes = txn.getTxData(signature, pubkey);

        // Step 4: Broadcast the transaction
        const sendTx = await this.client.sendTxBlockMode(txRawBytes);
        console.log(sendTx);

        // let result = await this.client.getRequestIdByTxHash(
        //     '722CEC4380D2A1D4FF075579D97756BC54FE086053F70FB32719A83F79BF3D84',
        // );
        // console.log(result);
    }
    async createDataSource() {
        // create data source
        const privkey = PrivateKey.fromMnemonic(
            'subject economy equal whisper turn boil guard giraffe stick retreat wealth card only buddy joy leave genuine resemble submit ghost top polar adjust avoid',
        );
        let fee = new Coin();
        fee.setDenom('uband');
        fee.setAmount('100000');
        const pubkey = privkey.toPubkey();
        console.log('address:', pubkey.toAddress().toAccBech32());
        const sender = pubkey.toAddress().toAccBech32();
        const randomPy = fs.readFileSync('src/random-script.py');
        const requestMessage = new MsgCreateDataSource(
            'randomnumber',
            randomPy,
            [fee],
            sender,
            sender,
            sender,
            'nothing',
        );
        const txn = new Transaction();
        txn.withMessages(requestMessage);
        await txn.withSender(this.client, sender);
        const chainId = await this.client.getChainId();
        txn.withChainId(chainId);
        let feeCoin = new Coin();
        feeCoin.setDenom('uband');
        feeCoin.setAmount('50000');

        const feeTx = new Fee();
        feeTx.setAmountList([feeCoin]);
        feeTx.setGasLimit(1000000);

        txn.withFee(feeTx);
        txn.withMemo('');
        const signDoc = txn.getSignDoc(pubkey);
        const signature = privkey.sign(signDoc);
        const txRawBytes = txn.getTxData(signature, pubkey);
        const sendTx = await this.client.sendTxBlockMode(txRawBytes);
        console.log(sendTx);
    }

    async createOracleScript() {
        const privkey = PrivateKey.fromMnemonic(
            'subject economy equal whisper turn boil guard giraffe stick retreat wealth card only buddy joy leave genuine resemble submit ghost top polar adjust avoid',
        );
        const wasmBuffer = fs.readFileSync('./src/oracle-script.wasm');
        const randomScript = new Uint8Array(wasmBuffer);
        let fee = new Coin();
        fee.setDenom('uband');
        fee.setAmount('100000');
        const pubkey = privkey.toPubkey();
        console.log('address:', pubkey.toAddress().toAccBech32());
        const sender = pubkey.toAddress().toAccBech32();
        const requestMessage = new MsgCreateOracleScript(
            'randomnumber',
            wasmBuffer,
            sender,
            sender,
        );
        const txn = new Transaction();
        txn.withMessages(requestMessage);
        await txn.withSender(this.client, sender);
        const chainId = await this.client.getChainId();
        txn.withChainId(chainId);
        let feeCoin = new Coin();
        feeCoin.setDenom('uband');
        feeCoin.setAmount('50000');

        const feeTx = new Fee();
        feeTx.setAmountList([feeCoin]);
        feeTx.setGasLimit(1000000);

        txn.withFee(feeTx);
        txn.withMemo('');
        const signDoc = txn.getSignDoc(pubkey);
        const signature = privkey.sign(signDoc);
        const txRawBytes = txn.getTxData(signature, pubkey);
        const sendTx = await this.client.sendTxBlockMode(txRawBytes);
        console.log(sendTx);
    }
}
