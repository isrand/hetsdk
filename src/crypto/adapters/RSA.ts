import {CryptoAdapter} from "../interfaces/CryptoAdapter";
import {EncryptedTopicKeysObject} from "../interfaces/EncryptedTopicKeysObject";
import {TopicParticipant} from "../../hedera/interfaces/TopicParticipant";
import crypto from "crypto";
import {TopicConfigurationObject} from "../../hedera/interfaces/TopicConfigurationObject";
import {TopicEncryptionKeyAndInitVector} from "../../hedera/interfaces/TopicEncryptionKeyAndInitVector";
import {TopicConfigurationMessage} from "../../hedera/interfaces/TopicConfigurationMessage";
import {DefaultAdapter} from "./DefaultAdapter";

export class RSA extends DefaultAdapter implements CryptoAdapter {

    // base64-encoded RSA public keys are 604 bytes in length
    private readonly expectedKeyLengthInBase64: number = 604;

    public getEncryptedTopicKeysObject(topicEncryptionKey: Buffer, topicEncryptionInitVector: Buffer, topicParticipants:Array<TopicParticipant>): EncryptedTopicKeysObject {
        const encryptedTopicKeysObject: EncryptedTopicKeysObject = {
            a: [],
            b: [],
        }

        for (const participant of topicParticipants) {
            const encryptedTopicEncryptionKey = this.asymmetricEncrypt(topicEncryptionKey, participant.publicKey);
            const encryptedTopicInitVector = this.asymmetricEncrypt(topicEncryptionInitVector, participant.publicKey);

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

    public decryptTopicConfigurationMessage(topicConfigurationMessageInBase64: string, privateKey: string): TopicConfigurationObject {
        const encryptedTopicKeysObject = this.getEncryptedTopicKeysObjectFromTopicConfigurationMessage(topicConfigurationMessageInBase64)

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
                    const topicConfigurationMessage = JSON.parse(Buffer.from(topicConfigurationMessageInBase64, 'base64').toString('utf8')) as TopicConfigurationMessage;
                    const decryptedTopicConfigurationObject = this.symmetricDecrypt(topicConfigurationMessage.a, topicEncryptionKey, topicEncryptionInitVector);

                    return JSON.parse(decryptedTopicConfigurationObject) as TopicConfigurationObject;
                } catch (error) {
                }
            }
        }

        throw new Error('Error fetching topic configuration object. Does user have access?');
    }

    public getTopicEncryptionKeyAndInitVector(topicConfigurationMessageInBase64: string, privateKey: string): TopicEncryptionKeyAndInitVector {
        const encryptedTopicKeysObject = this.getEncryptedTopicKeysObjectFromTopicConfigurationMessage(topicConfigurationMessageInBase64)

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

    public validateParticipantKeys(topicParticipants: Array<TopicParticipant>, topicEncryptionKeySize: number): void {
        for (const participant of topicParticipants) {
            if (participant.publicKey.length !== this.expectedKeyLengthInBase64) {
                throw new Error(`Participant ${participant.hederaPublicKey} RSA public key is of wrong size. Topic encryption algorithm key size is ${topicEncryptionKeySize}. (Is the key base64 encoded?)`);
            }
        }
    }
}
