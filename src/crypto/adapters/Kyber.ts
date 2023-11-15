import {CryptoAdapter} from "../interfaces/CryptoAdapter";
import {EncryptedTopicKeysObject} from "../interfaces/EncryptedTopicKeysObject";
import {TopicConfigurationObject} from "../../hedera/interfaces/TopicConfigurationObject";
import {TopicData} from "../../hedera/interfaces/TopicData";
import {TopicEncryptionKeyAndInitVector} from "../../hedera/interfaces/TopicEncryptionKeyAndInitVector";
import {DefaultAdapter} from "./DefaultAdapter";

const kyber = require('crystals-kyber');

export class Kyber extends DefaultAdapter implements CryptoAdapter {
    public constructor(private readonly keySize: number) {
        super();
    }

    public getEncryptedTopicKeysObject(topicEncryptionKey: Buffer, topicEncryptionInitVector: Buffer, publicKeys: string[]): EncryptedTopicKeysObject {
        const encryptedTopicKeysObject: EncryptedTopicKeysObject = {
            a: [],
            b: []
        }

        // Initialize the "c" key in the encrypted topic objects since we are using Kyber
        encryptedTopicKeysObject.c = [];

        for (const publicKey of publicKeys) {
            let symmetricAndEncapsulatedKey: Array<Array<number>> = this.getSymmetricAndEncapsulatedKey(Buffer.from(publicKey, 'base64'));

            const encapsulatedSymmetricKey: Array<number> | undefined = symmetricAndEncapsulatedKey[0];
            const symmetricKey: Array<number> | undefined = symmetricAndEncapsulatedKey[1];

            if (!encapsulatedSymmetricKey || !symmetricKey) {
                throw new Error('Error encrypting using kyber public key');
            }

            let initVector: Buffer = this.getInitVectorFromSymmetricKeyNumberArray(symmetricKey);

            const encryptedTopicEncryptionKey = this.symmetricEncrypt(Buffer.from(topicEncryptionKey).toString('base64'), Buffer.from(symmetricKey), initVector);
            const encryptedTopicInitVector = this.symmetricEncrypt(Buffer.from(topicEncryptionInitVector).toString('base64'), Buffer.from(symmetricKey), initVector);

            encryptedTopicKeysObject.a.push(encryptedTopicEncryptionKey);
            encryptedTopicKeysObject.b.push(encryptedTopicInitVector);
            encryptedTopicKeysObject.c.push(Buffer.from(encapsulatedSymmetricKey).toString('base64'));
        }

        return encryptedTopicKeysObject;
    }

    public decryptTopicConfigurationMessage(topicConfigurationMessageInBase64: string, privateKey: string): TopicData {
        const encryptedTopicKeysObject = this.getEncryptedTopicKeysObjectFromTopicConfigurationMessage(topicConfigurationMessageInBase64)
        if (!encryptedTopicKeysObject.c) {
            throw new Error('Encrypted topic keys object does not have encapsulated symmetric keys. (Are you trying to use Kyber on a non-Kyber encrypted topic?)');
        }

        for (const encapsulatedSymmetricKey of encryptedTopicKeysObject.c) {
            let symmetricKey = this.decryptEncapsulatedSymmetricKey(encapsulatedSymmetricKey, privateKey);
            const initVector = this.getInitVectorFromSymmetricKeyNumberArray(symmetricKey);

            for (const encryptedTopicKey of encryptedTopicKeysObject.a) {
                for (const encryptedTopicInitVector of encryptedTopicKeysObject.b) {
                    let topicEncryptionKey;
                    let topicEncryptionInitVector;

                    try {
                        topicEncryptionKey = this.symmetricDecrypt(encryptedTopicKey, symmetricKey, initVector);
                        topicEncryptionInitVector = this.symmetricDecrypt(encryptedTopicInitVector, symmetricKey, initVector);
                    } catch (error) {
                        continue;
                    }

                    try {
                        const topicConfigurationMessage = JSON.parse(Buffer.from(topicConfigurationMessageInBase64, 'base64').toString('utf8')) as TopicConfigurationObject;
                        const decryptedTopicConfigurationObject = this.symmetricDecrypt(topicConfigurationMessage.a, Buffer.from(topicEncryptionKey, 'base64'), Buffer.from(topicEncryptionInitVector, 'base64'));

                        return JSON.parse(decryptedTopicConfigurationObject) as TopicData;
                    } catch (error) {
                    }
                }
            }
        }

        throw new Error('Error fetching topic configuration object. Does user have access?');
    }

    public getTopicEncryptionKeyAndInitVector(topicConfigurationMessageInBase64: string, privateKey: string): TopicEncryptionKeyAndInitVector {
        const encryptedTopicKeysObject = this.getEncryptedTopicKeysObjectFromTopicConfigurationMessage(topicConfigurationMessageInBase64)
        if (!encryptedTopicKeysObject.c) {
            throw new Error('Encrypted topic keys object does not have encapsulated symmetric keys. (Are you trying to use Kyber on a non-Kyber encrypted topic?)');
        }

        for (const encapsulatedSymmetricKey of encryptedTopicKeysObject.c) {
            let symmetricKey = this.decryptEncapsulatedSymmetricKey(encapsulatedSymmetricKey, privateKey);
            const initVector = this.getInitVectorFromSymmetricKeyNumberArray(symmetricKey);

            for (const encryptedTopicKey of encryptedTopicKeysObject.a) {
                for (const encryptedTopicInitVector of encryptedTopicKeysObject.b) {
                    let topicEncryptionKey;
                    let topicEncryptionInitVector;

                    try {
                        topicEncryptionKey = this.symmetricDecrypt(encryptedTopicKey, symmetricKey, initVector);
                        topicEncryptionInitVector = this.symmetricDecrypt(encryptedTopicInitVector, symmetricKey, initVector);
                    } catch (error) {
                        continue;
                    }

                    return {
                        encryptionKey: topicEncryptionKey,
                        initVector: topicEncryptionInitVector
                    };
                }
            }
        }

        throw new Error('Error fetching topic encryption key and init vector. Does user have access?');
    }



    public validateParticipantKeys(topicParticipants: string[], topicEncryptionKeySize: number): void {
        // base64-encoded Kyber keys are 1068, 1580 or 2092 characters in length
        const expectedKeyLengthInBase64 = (this.keySize * 2) + 44;

        for (const publicKey of topicParticipants) {
            if (publicKey.length !== expectedKeyLengthInBase64) {
                throw new Error(`Kyber public key ${publicKey} is of wrong size. Topic encryption algorithm key size is ${topicEncryptionKeySize}. (Is the key base64 encoded?)`);
            }
        }
    }

    private decryptEncapsulatedSymmetricKey(encapsulatedSymmetricKey: string, privateKey: string) {
        switch (this.keySize) {
            case 512:
                return kyber.Decrypt512(Buffer.from(encapsulatedSymmetricKey, 'base64'), Buffer.from(privateKey, 'base64'));
            case 768:
                return kyber.Decrypt768(Buffer.from(encapsulatedSymmetricKey, 'base64'), Buffer.from(privateKey, 'base64'));
            case 1024:
                return kyber.Decrypt1024(Buffer.from(encapsulatedSymmetricKey, 'base64'), Buffer.from(privateKey, 'base64'));
        }
    }

    private getSymmetricAndEncapsulatedKey(publicKey: Buffer): Array<Array<number>> {
        switch (this.keySize) {
            case 512:
                return kyber.Encrypt512(publicKey);
            case 768:
                return kyber.Encrypt768(publicKey);
            case 1024:
                return kyber.Encrypt1024(publicKey);
            default:
                return [[]];
        }
    }

    private getInitVectorFromSymmetricKeyNumberArray(symmetricKey: Array<number>): Buffer {
        return Buffer.from(symmetricKey.filter((_, index) => index % 2 === 0))
    }
}
