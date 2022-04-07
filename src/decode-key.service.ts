import { Injectable } from '@nestjs/common';
import { Secp256k1, Secp256k1Signature, sha256 } from '@cosmjs/crypto';
import { fromBase64, fromHex, toBase64 } from '@cosmjs/encoding';
import {
    AccountData,
    AminoSignResponse,
    encodeSecp256k1Signature,
    makeCosmoshubPath,
    OfflineAminoSigner,
    serializeSignDoc,
    StdSignDoc,
    makeSignDoc,
} from '@cosmjs/amino';

@Injectable()
export class DecodeKeyService {
    constructor() {
        this.testDecode();
    }

    async testDecode() {
        const signature =
            'fwvp5gvAYPjWBz+XcB4UB0K70t2APc/71CNF1XLXKmVJlj87CWJvt/2hXVATJgifXPPPgQ8iVG+iyL/Q4+Yyfw==';
        const msg = 'tuanteo';
        const pubKey = {
            type: 'tendermint/PubKeySecp256k1',
            value: 'AwGiaDuo6ICUpXpZy7Ii/P4QnZWrC2+fvBvF6f+3r4f8',
        };
        const address = 'aura15f6wn3nymdnhnh5ddlqletuptjag09tryrtpq5';

        const signatureFromBase64 = fromBase64(signature);
        const pubKeyFromBase64 = fromBase64(pubKey.value);
        const base64 = Buffer.from(msg, 'base64');
        const msgFromBase64 = fromBase64(toBase64(base64));

        console.log('signatureFromBase64: ' + signatureFromBase64);
        console.log('pubkeyFromBase64: ' + pubKeyFromBase64);
        console.log('msgFromBase64: ' + msgFromBase64);
        console.log(Buffer.from(msg, 'utf8').toString('base64'));
        const signDoc = {
            chain_id: '',
            account_number: '0',
            sequence: '0',
            fee: {
                gas: '0',
                amount: [],
            },
            msgs: [
                {
                    type: 'sign/MsgSignData',
                    value: {
                        signer: address,
                        data: Buffer.from(msg, 'utf8').toString('base64'),
                    },
                },
            ],
            memo: '',
        };
        const signed = sha256(serializeSignDoc(signDoc));
        console.log(signed);
        console.log(
            await Secp256k1.verifySignature(
                Secp256k1Signature.fromFixedLength(fromBase64(signature)),
                signed,
                pubKeyFromBase64,
            ),
        );
    }
}
