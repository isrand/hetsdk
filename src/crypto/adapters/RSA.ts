import {ICryptoAdapter} from "../interfaces/ICryptoAdapter";
import {IEncryptedTopicKeysObject} from "../interfaces/IEncryptedTopicKeysObject";
import crypto from "crypto";
import {ITopicData} from "../../hedera/interfaces/ITopicData";
import {ITopicEncryptionKeyAndInitVector} from "../../hedera/interfaces/ITopicEncryptionKeyAndInitVector";
import {DefaultAdapter} from "./DefaultAdapter";
import {IKeyPair} from "../interfaces/IKeyPair";

export class RSA extends DefaultAdapter implements ICryptoAdapter {

    // base64-encoded RSA public keys are 604 bytes in length
    private readonly expectedKeyLengthInBase64: number = 604;

    public generateKeyPair(): IKeyPair {
        const keys = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: {
                type: "spki",
                format: 'pem'
            },
            privateKeyEncoding: {
                type: 'pkcs1',
                format: 'pem'
            }
        });

        return {
            publicKey: Buffer.from(keys.publicKey).toString('base64'),
            privateKey: Buffer.from(keys.privateKey).toString('base64')
        }
    }

    public getEncryptedTopicKeysObject(topicEncryptionKey: Buffer, topicEncryptionInitVector: Buffer, publicKeys: string[]): IEncryptedTopicKeysObject {
        const encryptedTopicKeysObject: IEncryptedTopicKeysObject = {
            a: [],
            b: [],
        }

        for (const publicKey of publicKeys) {
            const encryptedTopicEncryptionKey = this.asymmetricEncrypt(topicEncryptionKey, publicKey);
            const encryptedTopicInitVector = this.asymmetricEncrypt(topicEncryptionInitVector, publicKey);

            encryptedTopicKeysObject.a.push(Buffer.from(encryptedTopicEncryptionKey).toString('base64'));
            encryptedTopicKeysObject.b.push(Buffer.from(encryptedTopicInitVector).toString('base64'));
        }

        return encryptedTopicKeysObject;
    }

    public asymmetricEncrypt(data: Buffer, publicKey: string): Buffer {
        return crypto.publicEncrypt({ key: crypto.createPublicKey(Buffer.from(publicKey, 'base64').toString('utf8')) }, data);
    }

    public asymmetricDecrypt(data: Buffer, privateKey: string): Buffer {
        return crypto.privateDecrypt({ key: crypto.createPrivateKey(Buffer.from(privateKey, 'base64').toString('utf8')) }, data);
    }

    public decryptTopicData(encryptedTopicKeysObject: IEncryptedTopicKeysObject, encryptedTopicDataInBase64: string, privateKey: string): ITopicData {
        for (const encryptedTopicKey of encryptedTopicKeysObject.a) {
            for (const encryptedTopicInitVector of encryptedTopicKeysObject.b) {
                let topicEncryptionKey;
                let topicEncryptionInitVector;

                try {
                    topicEncryptionKey = this.asymmetricDecrypt(Buffer.from(encryptedTopicKey, 'base64'), privateKey);
                    topicEncryptionInitVector = this.asymmetricDecrypt(Buffer.from(encryptedTopicInitVector, 'base64'), privateKey);
                } catch (error) {
                    continue;
                }

                try {
                    const decryptedTopicConfigurationObject = this.symmetricDecrypt(encryptedTopicDataInBase64, topicEncryptionKey, topicEncryptionInitVector);

                    return JSON.parse(decryptedTopicConfigurationObject) as ITopicData;
                } catch (error) {
                }
            }
        }

        throw new Error('Error fetching topic data. Does user have access?');
    }

    public getTopicEncryptionKeyAndInitVector(encryptedTopicKeysObject: IEncryptedTopicKeysObject, privateKey: string): ITopicEncryptionKeyAndInitVector {
        for (const encryptedTopicKey of encryptedTopicKeysObject.a) {
            for (const encryptedTopicInitVector of encryptedTopicKeysObject.b) {
                let topicEncryptionKey;
                let topicEncryptionInitVector;

                try {
                    topicEncryptionKey = this.asymmetricDecrypt(Buffer.from(encryptedTopicKey, 'base64'), privateKey);
                    topicEncryptionInitVector = this.asymmetricDecrypt(Buffer.from(encryptedTopicInitVector, 'base64'), privateKey);
                } catch (error) {
                    continue;
                }

                return {
                    encryptionKey: Buffer.from(topicEncryptionKey).toString('base64'),
                    initVector: Buffer.from(topicEncryptionInitVector).toString('base64')
                };
            }
        }
        throw new Error('Error fetching topic encryption key and init vector. Does user have access?');
    }

    public validateParticipantKeys(topicParticipants: string[], topicEncryptionKeySize: number): void {
        for (const publicKey of topicParticipants) {
            if (publicKey.length !== this.expectedKeyLengthInBase64) {
                throw new Error(`RSA public key ${publicKey} is of wrong size. Topic encryption algorithm key size is ${topicEncryptionKeySize}. (Is the key base64 encoded?)`);
            }
        }
    }
}
