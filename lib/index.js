"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EncryptedTopic = void 0;
const sdk_1 = require("@hashgraph/sdk");
const Crypto_1 = require("./crypto/Crypto");
const crypto = __importStar(require("crypto"));
class EncryptedTopic {
    constructor(hederaConfiguration) {
        this.hederaConfiguration = hederaConfiguration;
        this.client = sdk_1.Client.forTestnet().setOperator(hederaConfiguration.hederaAccountId, sdk_1.PrivateKey.fromString(hederaConfiguration.hederaPrivateKey));
    }
    // "create" creates a new encrypted topic in the Hedera network
    create(topicParticipants, topicEncryptionAlgorithm, storeParticipants, topicMetadata) {
        return __awaiter(this, void 0, void 0, function* () {
            const algorithm = topicEncryptionAlgorithm.split('-')[0];
            const size = parseInt(topicEncryptionAlgorithm.split('-')[1]);
            this.crypto = new Crypto_1.Crypto(algorithm, size);
            this.crypto.validateParticipantKeys(topicParticipants, size);
            const submitKey = sdk_1.PrivateKey.generateED25519().toStringRaw();
            const topicEncryptionKey = Buffer.from(crypto.randomBytes(32));
            const topicEncryptionInitVector = Buffer.from(crypto.randomBytes(16));
            // Remove doubles from participants array
            const uniqueParticipantsArray = topicParticipants.filter((obj, index, self) => index === self.findIndex(o => (o.hederaPublicKey === obj.hederaPublicKey || o.publicKey === obj.publicKey)));
            const topicConfigurationObject = {
                s: submitKey,
                m: topicMetadata
            };
            if (storeParticipants) {
                topicConfigurationObject.p = uniqueParticipantsArray;
            }
            const encryptedTopicConfigurationObjectInBase64 = this.crypto.symmetricEncrypt(JSON.stringify(topicConfigurationObject), topicEncryptionKey, topicEncryptionInitVector);
            const topicEncryptionConfiguration = {
                a: algorithm,
                s: size,
                e: this.crypto.getEncryptedTopicKeysObject(topicEncryptionKey, topicEncryptionInitVector, topicParticipants)
            };
            const topicEncryptionConfigurationInBase64 = Buffer.from(JSON.stringify(topicEncryptionConfiguration)).toString('base64');
            const topicConfigurationMessage = {
                a: encryptedTopicConfigurationObjectInBase64,
                b: topicEncryptionConfigurationInBase64
            };
            try {
                // Create topic
                const topicCreateTransaction = new sdk_1.TopicCreateTransaction({
                    adminKey: sdk_1.PrivateKey.fromString(this.hederaConfiguration.hederaPrivateKey),
                    autoRenewAccountId: this.hederaConfiguration.hederaAccountId
                });
                topicCreateTransaction.setSubmitKey(sdk_1.PrivateKey.fromString(submitKey));
                yield topicCreateTransaction.freezeWith(this.client);
                yield topicCreateTransaction.sign(sdk_1.PrivateKey.fromString(this.hederaConfiguration.hederaPrivateKey));
                const encryptedTopicCreationResponse = yield topicCreateTransaction.execute(this.client);
                const encryptedTopicCreationReceipt = yield encryptedTopicCreationResponse.getReceipt(this.client);
                if (!encryptedTopicCreationReceipt.topicId) {
                    throw new Error('Topic Id not found in encrypted topic creation transaction receipt.');
                }
                const topicId = encryptedTopicCreationReceipt.topicId.toString() || '';
                // Submit topic configuration message to topic
                const topicSubmitMessageTransaction = new sdk_1.TopicMessageSubmitTransaction({
                    topicId: topicId,
                    message: Buffer.from(JSON.stringify(topicConfigurationMessage)).toString('base64'),
                });
                yield topicSubmitMessageTransaction.freezeWith(this.client);
                yield topicSubmitMessageTransaction.sign(sdk_1.PrivateKey.fromString(submitKey));
                yield topicSubmitMessageTransaction.sign(sdk_1.PrivateKey.fromString(this.hederaConfiguration.hederaPrivateKey));
                yield topicSubmitMessageTransaction.execute(this.client);
                return topicId;
            }
            catch (error) {
                console.error(error);
                throw error;
            }
        });
    }
    // "submitMessage" submits a message on an encrypted topic (if the user has access)
    // and returns the sequence number of the message
    submitMessage(topicId, message, privateKey) {
        return __awaiter(this, void 0, void 0, function* () {
            const topicEncryptionKeyAndInitVector = yield this.getTopicEncryptionKeyAndInitVector(topicId, privateKey);
            const messageEncryptionKey = Buffer.from(crypto.randomBytes(32));
            const messageEncryptionInitVector = Buffer.from(crypto.randomBytes(16));
            const encryptedMessage = this.crypto.symmetricEncrypt(message, messageEncryptionKey, messageEncryptionInitVector);
            const finalMessage = {
                m: encryptedMessage,
                k: this.crypto.symmetricEncrypt(Buffer.from(messageEncryptionKey).toString('base64'), Buffer.from(topicEncryptionKeyAndInitVector.encryptionKey, 'base64'), Buffer.from(topicEncryptionKeyAndInitVector.initVector, 'base64')),
                i: this.crypto.symmetricEncrypt(Buffer.from(messageEncryptionInitVector).toString('base64'), Buffer.from(topicEncryptionKeyAndInitVector.encryptionKey, 'base64'), Buffer.from(topicEncryptionKeyAndInitVector.initVector, 'base64'))
            };
            const finalMessageInBase64 = Buffer.from(JSON.stringify(finalMessage)).toString('base64');
            const submitKey = yield this.getTopicSubmitKey(topicId, privateKey);
            const transaction = yield new sdk_1.TopicMessageSubmitTransaction({
                topicId: topicId,
                message: finalMessageInBase64
            });
            yield transaction.freezeWith(this.client);
            yield transaction.sign(sdk_1.PrivateKey.fromString(this.hederaConfiguration.hederaPrivateKey));
            yield transaction.sign(sdk_1.PrivateKey.fromString(submitKey));
            const result = yield transaction.execute(this.client);
            const receipt = yield result.getReceipt(this.client);
            return receipt.topicSequenceNumber.toNumber();
        });
    }
    // "getMessage" gets a message from an encrypted topic (if the user has access)
    getMessage(topicId, sequenceNumber, privateKey) {
        return __awaiter(this, void 0, void 0, function* () {
            const topicEncryptionKeyAndInitVector = yield this.getTopicEncryptionKeyAndInitVector(topicId, privateKey);
            let encryptedMessageInBase64 = yield this.getTopicMessageInBase64(topicId, sequenceNumber);
            encryptedMessageInBase64 = Buffer.from(encryptedMessageInBase64, 'base64').toString('utf8');
            const encryptedMessage = JSON.parse(Buffer.from(encryptedMessageInBase64, 'base64').toString('utf8'));
            const decryptedMessageEncryptionKey = Buffer.from(this.crypto.symmetricDecrypt(encryptedMessage.k, Buffer.from(topicEncryptionKeyAndInitVector.encryptionKey, 'base64'), Buffer.from(topicEncryptionKeyAndInitVector.initVector, 'base64')), 'base64');
            const decryptedMessageInitVector = Buffer.from(this.crypto.symmetricDecrypt(encryptedMessage.i, Buffer.from(topicEncryptionKeyAndInitVector.encryptionKey, 'base64'), Buffer.from(topicEncryptionKeyAndInitVector.initVector, 'base64')), 'base64');
            return this.crypto.symmetricDecrypt(encryptedMessage.m, decryptedMessageEncryptionKey, decryptedMessageInitVector);
        });
    }
    // "getTopicParticipants" returns the participants of a topic (if the user has access, and if the user that created the topic chose to
    // store said list in the topic configuration)
    getTopicParticipants(topicId, privateKey) {
        return __awaiter(this, void 0, void 0, function* () {
            const topicConfigurationObject = yield this.getConfiguration(topicId, privateKey);
            if (topicConfigurationObject.p) {
                return topicConfigurationObject.p;
            }
            throw new Error('Topic configuration object did not store participants on creation.');
        });
    }
    // "getConfiguration" returns a topic's configuration object (if the user has access)
    getConfiguration(topicId, privateKey) {
        return __awaiter(this, void 0, void 0, function* () {
            let topicConfigurationMessageInBase64 = yield this.getTopicMessageInBase64(topicId, 1);
            topicConfigurationMessageInBase64 = Buffer.from(topicConfigurationMessageInBase64, 'base64').toString('utf8');
            if (!this.crypto) {
                const topicConfigurationMessage = JSON.parse(Buffer.from(topicConfigurationMessageInBase64, 'base64').toString('utf8'));
                const topicEncryptionConfiguration = JSON.parse(Buffer.from(topicConfigurationMessage.b, 'base64').toString('utf8'));
                this.crypto = new Crypto_1.Crypto(topicEncryptionConfiguration.a, topicEncryptionConfiguration.s);
            }
            return this.crypto.decryptTopicConfigurationMessage(topicConfigurationMessageInBase64, privateKey);
        });
    }
    getTopicEncryptionKeyAndInitVector(topicId, privateKey) {
        return __awaiter(this, void 0, void 0, function* () {
            let topicConfigurationMessageInBase64 = yield this.getTopicMessageInBase64(topicId, 1);
            topicConfigurationMessageInBase64 = Buffer.from(topicConfigurationMessageInBase64, 'base64').toString('utf8');
            if (!this.crypto) {
                const topicConfigurationMessage = JSON.parse(Buffer.from(topicConfigurationMessageInBase64, 'base64').toString('utf8'));
                const topicEncryptionConfiguration = JSON.parse(Buffer.from(topicConfigurationMessage.b, 'base64').toString('utf8'));
                this.crypto = new Crypto_1.Crypto(topicEncryptionConfiguration.a, topicEncryptionConfiguration.s);
            }
            return this.crypto.getTopicEncryptionKeyAndInitVector(topicConfigurationMessageInBase64, privateKey);
        });
    }
    getTopicSubmitKey(topicId, privateKey) {
        return __awaiter(this, void 0, void 0, function* () {
            const topicConfigurationObject = yield this.getConfiguration(topicId, privateKey);
            return topicConfigurationObject.s;
        });
    }
    getTopicMessageInBase64(topicId, sequenceNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            // First, check if topic has messages up to "sequenceNumber"
            const topicInfo = new sdk_1.TopicInfoQuery({
                topicId: topicId
            });
            const topicInfoResponse = yield topicInfo.execute(this.client);
            if (Number(sequenceNumber) > topicInfoResponse.sequenceNumber.toNumber()) {
                throw new Error('Topic sequence number is less than the one provided.');
            }
            const topicMessageQuery = new sdk_1.TopicMessageQuery({
                topicId: topicId
            }).setStartTime(0);
            const message = yield new Promise((resolve, reject) => {
                topicMessageQuery.subscribe(this.client, (error) => {
                    reject(error);
                }, (topicMessage) => {
                    // Check if the original message was split among different chunks
                    if (topicMessage.chunks.length > 0) {
                        for (const chunk of topicMessage.chunks) {
                            if (chunk.sequenceNumber.toNumber() === Number(sequenceNumber)) {
                                resolve(Buffer.from(topicMessage.contents).toString('base64'));
                            }
                        }
                    }
                    // Check if the original message is kept within just one message (no chunks)
                    if (topicMessage.sequenceNumber.toNumber() === Number(sequenceNumber)) {
                        resolve(Buffer.from(topicMessage.contents).toString('base64'));
                    }
                });
            });
            return message;
        });
    }
}
exports.EncryptedTopic = EncryptedTopic;
//# sourceMappingURL=index.js.map