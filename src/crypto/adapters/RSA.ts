import {CryptoAdapter} from "../interfaces/CryptoAdapter";
import {EncryptedTopicKeysObject} from "../interfaces/EncryptedTopicKeysObject";
import crypto from "crypto";
import {TopicData} from "../../hedera/interfaces/TopicData";
import {TopicEncryptionKeyAndInitVector} from "../../hedera/interfaces/TopicEncryptionKeyAndInitVector";
import {DefaultAdapter} from "./DefaultAdapter";
import {KeyPair} from "../interfaces/KeyPair";

export class RSA extends DefaultAdapter implements CryptoAdapter {

    // base64-encoded RSA public keys are 604 bytes in length
    private readonly expectedKeyLengthInBase64: number = 604;

    public generateKeyPair(): KeyPair {
        const keys = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048, // bits - standard for RSA keys
            publicKeyEncoding: {
                type: 'pkcs1', // "Public Key Cryptography Standards 1"
                format: 'pem' // Most common formatting choice
            },
            privateKeyEncoding: {
                type: 'pkcs1', // "Public Key Cryptography Standards 1"
                format: 'pem' // Most common formatting choice
            }
        });

        return {
            publicKey: Buffer.from(keys.publicKey).toString('base64'),
            privateKey: Buffer.from(keys.privateKey).toString('base64')
        }
    }

    public getEncryptedTopicKeysObject(topicEncryptionKey: Buffer, topicEncryptionInitVector: Buffer, publicKeys: string[]): EncryptedTopicKeysObject {
        const encryptedTopicKeysObject: EncryptedTopicKeysObject = {
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

    public decryptTopicData(encryptedTopicKeysObject: EncryptedTopicKeysObject, encryptedTopicDataInBase64: string, privateKey: string): TopicData {
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

                    return JSON.parse(decryptedTopicConfigurationObject) as TopicData;
                } catch (error) {
                }
            }
        }

        throw new Error('Error fetching topic configuration object. Does user have access?');
    }

    public getTopicEncryptionKeyAndInitVector(encryptedTopicKeysObject: EncryptedTopicKeysObject, privateKey: string): TopicEncryptionKeyAndInitVector {
        for (const encryptedTopicKey of encryptedTopicKeysObject.a) {
            for (const encryptedTopicInitVector of encryptedTopicKeysObject.b) {
                let topicEncryptionKey;
                let topicEncryptionInitVector;

                try {
                    topicEncryptionKey = this.asymmetricDecrypt(Buffer.from(encryptedTopicKey, 'base64'), privateKey);
                    topicEncryptionInitVector = this.asymmetricDecrypt(Buffer.from(encryptedTopicInitVector, 'base64'), privateKey);
                } catch (error) {
                    console.log(error);
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
