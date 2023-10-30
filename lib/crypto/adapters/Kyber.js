"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Kyber = void 0;
const crypto_1 = __importDefault(require("crypto"));
const kyber = require('crystals-kyber');
class Kyber {
    constructor(keySize) {
        this.keySize = keySize;
    }
    getEncryptedTopicKeysObject(topicEncryptionKey, topicEncryptionInitVector, topicParticipants) {
        const encryptedTopicKeysObject = {
            a: [],
            b: [],
        };
        // Initialize the "c" key in the encrypted topic objects since we are using Kyber
        encryptedTopicKeysObject.c = [];
        for (const participant of topicParticipants) {
            const kyberPublicKey = Buffer.from(participant.publicKey, 'base64');
            let symmetricAndEncapsulatedKey = this.getSymmetricAndEncapsulatedKey(kyberPublicKey);
            const encapsulatedSymmetricKey = symmetricAndEncapsulatedKey[0];
            const symmetricKey = symmetricAndEncapsulatedKey[1];
            if (!encapsulatedSymmetricKey || !symmetricKey) {
                throw new Error('Error encrypting using kyber public key');
            }
            let initVector = this.getInitVectorFromSymmetricKeyNumberArray(symmetricKey);
            const encryptedTopicEncryptionKey = this.symmetricEncrypt(Buffer.from(topicEncryptionKey).toString('base64'), Buffer.from(symmetricKey), initVector);
            const encryptedTopicInitVector = this.symmetricEncrypt(Buffer.from(topicEncryptionInitVector).toString('base64'), Buffer.from(symmetricKey), initVector);
            encryptedTopicKeysObject.a.push(encryptedTopicEncryptionKey);
            encryptedTopicKeysObject.b.push(encryptedTopicInitVector);
            encryptedTopicKeysObject.c.push(Buffer.from(encapsulatedSymmetricKey).toString('base64'));
        }
        return encryptedTopicKeysObject;
    }
    symmetricEncrypt(data, symmetricKey, initVector) {
        const messageCipher = crypto_1.default.createCipheriv('aes256', Buffer.from(symmetricKey), Buffer.from(initVector));
        let encryptedData = messageCipher.update(data, 'utf-8', 'base64');
        encryptedData += messageCipher.final('base64');
        return encryptedData;
    }
    symmetricDecrypt(data, symmetricKey, initVector) {
        const decipher = crypto_1.default.createDecipheriv('aes256', Buffer.from(symmetricKey), Buffer.from(initVector));
        let decryptedData = decipher.update(data, 'base64', 'utf-8');
        decryptedData += decipher.final('utf-8');
        return decryptedData;
    }
    decryptTopicConfigurationMessage(topicConfigurationMessageInBase64, privateKey) {
        const topicConfigurationMessage = JSON.parse(Buffer.from(topicConfigurationMessageInBase64, 'base64').toString('utf8'));
        const topicEncryptionConfigurationObject = JSON.parse(Buffer.from(topicConfigurationMessage.b, 'base64').toString('utf8'));
        const encryptedTopicKeysObject = topicEncryptionConfigurationObject.e;
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
                    }
                    catch (error) {
                        console.log(error);
                        continue;
                    }
                    try {
                        const decryptedTopicConfigurationObject = this.symmetricDecrypt(topicConfigurationMessage.a, Buffer.from(topicEncryptionKey, 'base64'), Buffer.from(topicEncryptionInitVector, 'base64'));
                        return JSON.parse(decryptedTopicConfigurationObject);
                    }
                    catch (error) {
                        continue;
                    }
                }
            }
        }
        throw new Error('Error fetching topic configuration object. Does user have access?');
    }
    getTopicEncryptionKeyAndInitVector(topicConfigurationMessageInBase64, privateKey) {
        const topicConfigurationMessage = JSON.parse(Buffer.from(topicConfigurationMessageInBase64, 'base64').toString('utf8'));
        const topicEncryptionConfigurationObject = JSON.parse(Buffer.from(topicConfigurationMessage.b, 'base64').toString('utf8'));
        const encryptedTopicKeysObject = topicEncryptionConfigurationObject.e;
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
                    }
                    catch (error) {
                        console.log(error);
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
    validateParticipantKeys(topicParticipants, topicEncryptionKeySize) {
        // base64-encoded Kyber keys are 1068, 1580 or 2092 characters in length
        const expectedKeyLengthInBase64 = (this.keySize * 2) + 44;
        for (const participant of topicParticipants) {
            if (participant.publicKey.length !== expectedKeyLengthInBase64) {
                throw new Error(`Participant ${participant.hederaPublicKey} Kyber public key is of wrong size. Topic encryption algorithm key size is ${topicEncryptionKeySize}. (Is the key base64 encoded?)`);
            }
        }
    }
    decryptEncapsulatedSymmetricKey(encapsulatedSymmetricKey, privateKey) {
        switch (this.keySize) {
            case 512:
                return kyber.Decrypt512(Buffer.from(encapsulatedSymmetricKey, 'base64'), Buffer.from(privateKey, 'base64'));
            case 768:
                return kyber.Decrypt768(Buffer.from(encapsulatedSymmetricKey, 'base64'), Buffer.from(privateKey, 'base64'));
            case 1024:
                return kyber.Decrypt1024(Buffer.from(encapsulatedSymmetricKey, 'base64'), Buffer.from(privateKey, 'base64'));
        }
    }
    getSymmetricAndEncapsulatedKey(publicKey) {
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
    getInitVectorFromSymmetricKeyNumberArray(symmetricKey) {
        return Buffer.from(symmetricKey.filter((_, index) => index % 2 === 0));
    }
}
exports.Kyber = Kyber;
//# sourceMappingURL=Kyber.js.map