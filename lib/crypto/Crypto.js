"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Crypto = void 0;
const Kyber_1 = require("./adapters/Kyber");
const RSA_1 = require("./adapters/RSA");
class Crypto {
    constructor(algorithm, size) {
        this.algorithm = algorithm;
        this.size = size;
        if (algorithm === 'kyber') {
            this.adapter = new Kyber_1.Kyber(size);
        }
        this.adapter = new RSA_1.RSA();
    }
    validateParticipantKeys(topicParticipants, topicEncryptionKeySize) {
        this.adapter.validateParticipantKeys(topicParticipants, topicEncryptionKeySize);
    }
    symmetricEncrypt(data, symmetricKey, initVector) {
        return this.adapter.symmetricEncrypt(data, symmetricKey, initVector);
    }
    symmetricDecrypt(data, symmetricKey, initVector) {
        return this.adapter.symmetricDecrypt(data, symmetricKey, initVector);
    }
    getEncryptedTopicKeysObject(topicEncryptionKey, topicEncryptionInitVector, topicParticipants) {
        return this.adapter.getEncryptedTopicKeysObject(topicEncryptionKey, topicEncryptionInitVector, topicParticipants);
    }
    decryptTopicConfigurationMessage(topicConfigurationMessageInBase64, privateKey) {
        return this.adapter.decryptTopicConfigurationMessage(topicConfigurationMessageInBase64, privateKey);
    }
    getTopicEncryptionKeyAndInitVector(topicConfigurationMessageInBase64, privateKey) {
        return this.adapter.getTopicEncryptionKeyAndInitVector(topicConfigurationMessageInBase64, privateKey);
    }
}
exports.Crypto = Crypto;
//# sourceMappingURL=Crypto.js.map