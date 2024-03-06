"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RSA = void 0;
const crypto_1 = __importDefault(require("crypto"));
const DefaultAdapter_1 = require("./DefaultAdapter");
const Errors_1 = require("../../errors/Errors");
class RSA extends DefaultAdapter_1.DefaultAdapter {
    constructor() {
        super(...arguments);
        // base64-encoded RSA public keys are 604 bytes in length
        this.expectedKeyLengthInBase64 = 604;
    }
    generateKeyPair() {
        const keys = crypto_1.default.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: {
                type: 'spki',
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
        };
    }
    getEncryptedTopicKeysObject(topicEncryptionKey, topicEncryptionInitVector, publicKeys) {
        const encryptedTopicKeysObject = {
            a: [],
            b: []
        };
        for (const publicKey of publicKeys) {
            const encryptedTopicEncryptionKey = this.asymmetricEncrypt(topicEncryptionKey, publicKey);
            const encryptedTopicInitVector = this.asymmetricEncrypt(topicEncryptionInitVector, publicKey);
            encryptedTopicKeysObject.a.push(Buffer.from(encryptedTopicEncryptionKey).toString('base64'));
            encryptedTopicKeysObject.b.push(Buffer.from(encryptedTopicInitVector).toString('base64'));
        }
        return encryptedTopicKeysObject;
    }
    asymmetricEncrypt(dataToEncrypt, publicKey) {
        return crypto_1.default.publicEncrypt({ key: crypto_1.default.createPublicKey(Buffer.from(publicKey, 'base64').toString('utf8')) }, dataToEncrypt);
    }
    asymmetricDecrypt(dataToDecrypt, privateKey) {
        return crypto_1.default.privateDecrypt({ key: crypto_1.default.createPrivateKey(Buffer.from(privateKey, 'base64').toString('utf8')) }, dataToDecrypt);
    }
    decryptTopicData(encryptedTopicKeysObject, encryptedTopicDataInBase64, privateKey) {
        for (const encryptedTopicKey of encryptedTopicKeysObject.a) {
            for (const encryptedTopicInitVector of encryptedTopicKeysObject.b) {
                let topicEncryptionKey;
                let topicEncryptionInitVector;
                try {
                    topicEncryptionKey = this.asymmetricDecrypt(Buffer.from(encryptedTopicKey, 'base64'), privateKey);
                    topicEncryptionInitVector = this.asymmetricDecrypt(Buffer.from(encryptedTopicInitVector, 'base64'), privateKey);
                }
                catch (error) {
                    continue;
                }
                const decryptedTopicConfigurationObject = this.symmetricDecrypt(encryptedTopicDataInBase64, topicEncryptionKey, topicEncryptionInitVector);
                return JSON.parse(decryptedTopicConfigurationObject);
            }
        }
        throw new Error(Errors_1.Errors.AccessDeniedFetchTopicData);
    }
    getTopicEncryptionKeyAndInitVector(encryptedTopicKeysObject, privateKey) {
        for (const encryptedTopicKey of encryptedTopicKeysObject.a) {
            for (const encryptedTopicInitVector of encryptedTopicKeysObject.b) {
                let topicEncryptionKey;
                let topicEncryptionInitVector;
                try {
                    topicEncryptionKey = this.asymmetricDecrypt(Buffer.from(encryptedTopicKey, 'base64'), privateKey);
                    topicEncryptionInitVector = this.asymmetricDecrypt(Buffer.from(encryptedTopicInitVector, 'base64'), privateKey);
                }
                catch (error) {
                    continue;
                }
                return {
                    encryptionKey: Buffer.from(topicEncryptionKey).toString('base64'),
                    initVector: Buffer.from(topicEncryptionInitVector).toString('base64')
                };
            }
        }
        throw new Error(Errors_1.Errors.AccessDeniedFetchTopicEncryptionKeyAndInitVector);
    }
    validateParticipantKeys(topicParticipants) {
        for (const publicKey of topicParticipants) {
            if (publicKey.length !== this.expectedKeyLengthInBase64) {
                throw new Error(Errors_1.Errors.PublicKeyWrongSize);
            }
        }
    }
}
exports.RSA = RSA;
//# sourceMappingURL=RSA.js.map