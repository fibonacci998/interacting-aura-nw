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
@Injectable()
export class BandService {
    endpoint = 'https://laozi-testnet4.bandchain.org/grpc-web';
    client = new Client(this.endpoint);
    constructor() {
        console.log(123);
        sleep(1000);
        console.log(456);
        // this.exampleGetReferenceData();
        this.testBand();
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
        const obi = new Obi('{symbols:[string],multiplier:u64}/{rates:[u64]}');
        // const calldata = obi.encodeInput({ symbols: ['ETH'], multiplier: 100 });
        const calldata = obi.encodeInput({ symbols: ['ETH'], multiplier: 100 });
        const oracleScriptId = 11;
        const askCount = 4;
        const minCount = 3;
        const clientId = 'from_bandchain.js';
        let script = await this.client.getOracleScript(11);
        console.log(script);
        let feeLimit = new Coin();
        feeLimit.setDenom('uband');
        feeLimit.setAmount('9000000');

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
    }
}
