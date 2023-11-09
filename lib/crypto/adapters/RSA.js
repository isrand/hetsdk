"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RSA = void 0;
const crypto_1 = __importDefault(require("crypto"));
const DefaultAdapter_1 = require("./DefaultAdapter");
class RSA extends DefaultAdapter_1.DefaultAdapter {
    constructor() {
        super(...arguments);
        // base64-encoded RSA public keys are 604 bytes in length
        this.expectedKeyLengthInBase64 = 604;
    }
    getEncryptedTopicKeysObject(topicEncryptionKey, topicEncryptionInitVector, topicParticipants) {
        const encryptedTopicKeysObject = {
            a: [],
            b: [],
        };
        for (const participant of topicParticipants) {
            const encryptedTopicEncryptionKey = this.asymmetricEncrypt(topicEncryptionKey, participant.publicKey);
            const encryptedTopicInitVector = this.asymmetricEncrypt(topicEncryptionInitVector, participant.publicKey);
            encryptedTopicKeysObject.a.push(Buffer.from(encryptedTopicEncryptionKey).toString('base64'));
            encryptedTopicKeysObject.b.push(Buffer.from(encryptedTopicInitVector).toString('base64'));
        }
        return encryptedTopicKeysObject;
    }
    asymmetricEncrypt(data, publicKey) {
        return crypto_1.default.publicEncrypt({
            key: crypto_1.default.createPublicKey(Buffer.from(publicKey, 'base64').toString('utf8')),
        }, data);
    }
    asymmetricDecrypt(data, privateKey) {
        return crypto_1.default.privateDecrypt({
            key: crypto_1.default.createPrivateKey(Buffer.from(privateKey, 'base64').toString('utf8')),
        }, data);
    }
    decryptTopicConfigurationMessage(topicConfigurationMessageInBase64, privateKey) {
        const encryptedTopicKeysObject = this.getEncryptedTopicKeysObjectFromTopicConfigurationMessage(topicConfigurationMessageInBase64);
        for (const encryptedTopicKey of encryptedTopicKeysObject.a) {
            for (const encryptedTopicInitVector of encryptedTopicKeysObject.b) {
                let topicEncryptionKey;
                let topicEncryptionInitVector;
                try {
                    topicEncryptionKey = this.asymmetricDecrypt(Buffer.from(encryptedTopicKey, 'base64'), privateKey);
                    topicEncryptionInitVector = this.asymmetricDecrypt(Buffer.from(encryptedTopicInitVector, 'base64'), privateKey);
                }
                catch (error) {
                    console.log(error);
                    continue;
                }
                try {
                    const topicConfigurationMessage = JSON.parse(Buffer.from(topicConfigurationMessageInBase64, 'base64').toString('utf8'));
                    const decryptedTopicConfigurationObject = this.symmetricDecrypt(topicConfigurationMessage.a, topicEncryptionKey, topicEncryptionInitVector);
                    return JSON.parse(decryptedTopicConfigurationObject);
                }
                catch (error) {
                    continue;
                }
            }
        }
        throw new Error('Error fetching topic configuration object. Does user have access?');
    }
    getTopicEncryptionKeyAndInitVector(topicConfigurationMessageInBase64, privateKey) {
        const encryptedTopicKeysObject = this.getEncryptedTopicKeysObjectFromTopicConfigurationMessage(topicConfigurationMessageInBase64);
        for (const encryptedTopicKey of encryptedTopicKeysObject.a) {
            for (const encryptedTopicInitVector of encryptedTopicKeysObject.b) {
                let topicEncryptionKey;
                let topicEncryptionInitVector;
                try {
                    topicEncryptionKey = this.asymmetricDecrypt(Buffer.from(encryptedTopicKey, 'base64'), privateKey);
                    topicEncryptionInitVector = this.asymmetricDecrypt(Buffer.from(encryptedTopicInitVector, 'base64'), privateKey);
                }
                catch (error) {
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
    validateParticipantKeys(topicParticipants, topicEncryptionKeySize) {
        for (const participant of topicParticipants) {
            if (participant.publicKey.length !== this.expectedKeyLengthInBase64) {
                throw new Error(`Participant ${participant.hederaPublicKey} RSA public key is of wrong size. Topic encryption algorithm key size is ${topicEncryptionKeySize}. (Is the key base64 encoded?)`);
            }
        }
    }
}
exports.RSA = RSA;
//# sourceMappingURL=RSA.js.map