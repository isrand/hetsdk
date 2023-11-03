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
const StorageOptions_1 = require("./hedera/enums/StorageOptions");
const EncryptionAlgorithm_1 = require("./crypto/enums/EncryptionAlgorithm");
class EncryptedTopic {
    constructor(hederaConfiguration) {
        this.hederaConfiguration = hederaConfiguration;
        this.client = sdk_1.Client.forTestnet().setOperator(hederaConfiguration.hederaAccountId, sdk_1.PrivateKey.fromString(hederaConfiguration.hederaPrivateKey));
    }
    // "create" creates a new encrypted topic in the Hedera network
    create(createEncryptedTopicConfiguration) {
        return __awaiter(this, void 0, void 0, function* () {
            const algorithm = createEncryptedTopicConfiguration.algorithm.split('-')[0];
            const size = parseInt(createEncryptedTopicConfiguration.algorithm.split('-')[1]);
            this.crypto = new Crypto_1.Crypto(algorithm, size);
            this.crypto.validateParticipantKeys(createEncryptedTopicConfiguration.participants, size);
            const submitKey = sdk_1.PrivateKey.generateED25519().toStringRaw();
            const topicEncryptionKey = Buffer.from(crypto.randomBytes(32));
            const topicEncryptionInitVector = Buffer.from(crypto.randomBytes(16));
            // Remove doubles from participants array
            const uniqueParticipantsArray = createEncryptedTopicConfiguration.participants.filter((obj, index, self) => index === self.findIndex(o => (o.hederaPublicKey === obj.hederaPublicKey || o.publicKey === obj.publicKey)));
            const topicConfigurationObject = {
                s: submitKey,
                m: createEncryptedTopicConfiguration.metadata
            };
            if (createEncryptedTopicConfiguration.storageOptions.storeParticipantsArray) {
                topicConfigurationObject.p = uniqueParticipantsArray;
            }
            const encryptedTopicConfigurationObjectInBase64 = this.crypto.symmetricEncrypt(JSON.stringify(topicConfigurationObject), topicEncryptionKey, topicEncryptionInitVector);
            const topicEncryptionConfiguration = {
                a: algorithm,
                s: size,
                e: this.crypto.getEncryptedTopicKeysObject(topicEncryptionKey, topicEncryptionInitVector, uniqueParticipantsArray)
            };
            const topicEncryptionConfigurationInBase64 = Buffer.from(JSON.stringify(topicEncryptionConfiguration)).toString('base64');
            const topicConfigurationMessage = {
                a: encryptedTopicConfigurationObjectInBase64,
                b: topicEncryptionConfigurationInBase64
            };
            const topicConfigurationMessageInBase64 = Buffer.from(JSON.stringify(topicConfigurationMessage)).toString('base64');
            try {
                // Use the File Service to store the topic configuration message
                if (createEncryptedTopicConfiguration.storageOptions.configuration === StorageOptions_1.StorageOptions.File) {
                    // Create the file containing the topic configuration message
                    const fileCreateTransaction = new sdk_1.FileCreateTransaction({
                        keys: [sdk_1.PrivateKey.fromStringED25519(this.hederaConfiguration.hederaPrivateKey).publicKey]
                    });
                    yield fileCreateTransaction.freezeWith(this.client);
                    yield fileCreateTransaction.sign(sdk_1.PrivateKey.fromString(this.hederaConfiguration.hederaPrivateKey));
                    const fileCreateTransactionResponse = yield fileCreateTransaction.execute(this.client);
                    const fileCreateTransactionReceipt = yield fileCreateTransactionResponse.getReceipt(this.client);
                    if (!fileCreateTransactionReceipt.fileId) {
                        throw new Error('Error while fetching file id from file creation transaction receipt');
                    }
                    const fileId = fileCreateTransactionReceipt.fileId.toString();
                    const fileUpdateTransaction = new sdk_1.FileUpdateTransaction({
                        fileId: fileId,
                        contents: topicConfigurationMessageInBase64,
                        keys: [sdk_1.PrivateKey.fromStringED25519(this.hederaConfiguration.hederaPrivateKey).publicKey]
                    });
                    yield fileUpdateTransaction.freezeWith(this.client);
                    yield fileUpdateTransaction.sign(sdk_1.PrivateKey.fromString(this.hederaConfiguration.hederaPrivateKey));
                    yield fileUpdateTransaction.execute(this.client);
                    // Create topic
                    const topicCreateTransaction = new sdk_1.TopicCreateTransaction({
                        adminKey: sdk_1.PrivateKey.fromString(this.hederaConfiguration.hederaPrivateKey),
                        autoRenewAccountId: this.hederaConfiguration.hederaAccountId
                    });
                    topicCreateTransaction.setSubmitKey(sdk_1.PrivateKey.fromString(submitKey));
                    const topicMemoObject = this.createTopicMemoObject(createEncryptedTopicConfiguration.storageOptions, fileId);
                    // Set the topic memo to point at the file containing the topic configuration message
                    topicCreateTransaction.setTopicMemo(JSON.stringify(topicMemoObject));
                    yield topicCreateTransaction.freezeWith(this.client);
                    yield topicCreateTransaction.sign(sdk_1.PrivateKey.fromString(this.hederaConfiguration.hederaPrivateKey));
                    const encryptedTopicCreationResponse = yield topicCreateTransaction.execute(this.client);
                    const encryptedTopicCreationReceipt = yield encryptedTopicCreationResponse.getReceipt(this.client);
                    if (!encryptedTopicCreationReceipt.topicId) {
                        throw new Error('Topic Id not found in encrypted topic creation transaction receipt.');
                    }
                    const topicId = encryptedTopicCreationReceipt.topicId.toString();
                    // Cache the topic memo object for future use
                    this.topicMemoObject = topicMemoObject;
                    // Cache the topic configuration message in base64 for future use
                    this.topicConfigurationMessageInBase64 = Buffer.from(JSON.stringify(topicConfigurationMessage)).toString('base64');
                    return topicId;
                }
                // Create topic
                const topicCreateTransaction = new sdk_1.TopicCreateTransaction({
                    adminKey: sdk_1.PrivateKey.fromString(this.hederaConfiguration.hederaPrivateKey),
                    autoRenewAccountId: this.hederaConfiguration.hederaAccountId
                });
                topicCreateTransaction.setSubmitKey(sdk_1.PrivateKey.fromString(submitKey));
                const topicMemoObject = this.createTopicMemoObject(createEncryptedTopicConfiguration.storageOptions);
                topicCreateTransaction.setTopicMemo(JSON.stringify(topicMemoObject));
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
                // Cache the topic memo object for future use
                this.topicMemoObject = topicMemoObject;
                // Cache the topic configuration message in base64 for future use
                this.topicConfigurationMessageInBase64 = Buffer.from(JSON.stringify(topicConfigurationMessage)).toString('base64');
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
            const topicMemoObject = yield this.getTopicMemo(topicId);
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
            // Topic memo specifies that topic messages should be stored using the File Service
            if (topicMemoObject.s.m.u) {
                const fileCreateTransaction = new sdk_1.FileCreateTransaction({
                    keys: [sdk_1.PrivateKey.fromStringED25519(this.hederaConfiguration.hederaPrivateKey).publicKey]
                });
                yield fileCreateTransaction.freezeWith(this.client);
                yield fileCreateTransaction.sign(sdk_1.PrivateKey.fromString(this.hederaConfiguration.hederaPrivateKey));
                const fileCreateTransactionResponse = yield fileCreateTransaction.execute(this.client);
                const fileCreateTransactionReceipt = yield fileCreateTransactionResponse.getReceipt(this.client);
                if (!fileCreateTransactionReceipt.fileId) {
                    throw new Error('Error while fetching file id from file creation transaction receipt');
                }
                const fileId = fileCreateTransactionReceipt.fileId.toString();
                const fileUpdateTransaction = new sdk_1.FileUpdateTransaction({
                    fileId: fileId,
                    contents: finalMessageInBase64,
                    keys: [sdk_1.PrivateKey.fromStringED25519(this.hederaConfiguration.hederaPrivateKey).publicKey]
                });
                yield fileUpdateTransaction.freezeWith(this.client);
                yield fileUpdateTransaction.sign(sdk_1.PrivateKey.fromString(this.hederaConfiguration.hederaPrivateKey));
                yield fileUpdateTransaction.execute(this.client);
                const transaction = yield new sdk_1.TopicMessageSubmitTransaction({
                    topicId: topicId,
                    message: Buffer.from(fileId).toString('base64')
                });
                yield transaction.freezeWith(this.client);
                yield transaction.sign(sdk_1.PrivateKey.fromString(this.hederaConfiguration.hederaPrivateKey));
                yield transaction.sign(sdk_1.PrivateKey.fromString(submitKey));
                const result = yield transaction.execute(this.client);
                const receipt = yield result.getReceipt(this.client);
                return receipt.topicSequenceNumber.toNumber();
            }
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
            const topicMemoObject = yield this.getTopicMemo(topicId);
            const topicEncryptionKeyAndInitVector = yield this.getTopicEncryptionKeyAndInitVector(topicId, privateKey);
            // Topic memo specifies that topic messages should be stored using the File Service
            if (topicMemoObject.s.m.u) {
                const messageFileIdInBase64 = yield this.getMessageFromTopicInBase64(topicId, sequenceNumber);
                let fileId = Buffer.from(messageFileIdInBase64, 'base64').toString('utf8');
                const encryptedMessageInBase64 = yield this.getFileContentsInBase64(Buffer.from(fileId, 'base64').toString('utf8'));
                const encryptedMessage = JSON.parse(Buffer.from(encryptedMessageInBase64, 'base64').toString('utf8'));
                const decryptedMessageEncryptionKey = Buffer.from(this.crypto.symmetricDecrypt(encryptedMessage.k, Buffer.from(topicEncryptionKeyAndInitVector.encryptionKey, 'base64'), Buffer.from(topicEncryptionKeyAndInitVector.initVector, 'base64')), 'base64');
                const decryptedMessageInitVector = Buffer.from(this.crypto.symmetricDecrypt(encryptedMessage.i, Buffer.from(topicEncryptionKeyAndInitVector.encryptionKey, 'base64'), Buffer.from(topicEncryptionKeyAndInitVector.initVector, 'base64')), 'base64');
                return this.crypto.symmetricDecrypt(encryptedMessage.m, decryptedMessageEncryptionKey, decryptedMessageInitVector);
            }
            let encryptedMessageInBase64 = yield this.getMessageFromTopicInBase64(topicId, sequenceNumber);
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
            if (!this.topicConfigurationMessageInBase64) {
                yield this.setTopicConfigurationMessageInBase64(topicId);
            }
            if (!this.crypto) {
                yield this.initializeCryptoWithTopicConfiguration(this.topicConfigurationMessageInBase64);
            }
            return this.crypto.decryptTopicConfigurationMessage(this.topicConfigurationMessageInBase64, privateKey);
        });
    }
    getTopicMemo(topicId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.topicMemoObject) {
                const topicInfo = new sdk_1.TopicInfoQuery({
                    topicId: topicId
                });
                const topicInfoResponse = yield topicInfo.execute(this.client);
                this.topicMemoObject = JSON.parse(topicInfoResponse.topicMemo);
            }
            return this.topicMemoObject;
        });
    }
    createTopicMemoObject(topicStorageOptions, topicConfigurationFileId) {
        return {
            s: {
                c: {
                    i: topicConfigurationFileId,
                    u: topicStorageOptions.configuration === StorageOptions_1.StorageOptions.File,
                },
                m: {
                    u: topicStorageOptions.messages === StorageOptions_1.StorageOptions.File
                }
            }
        };
    }
    getTopicEncryptionKeyAndInitVector(topicId, privateKey) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.topicConfigurationMessageInBase64) {
                yield this.setTopicConfigurationMessageInBase64(topicId);
            }
            if (!this.crypto) {
                yield this.initializeCryptoWithTopicConfiguration(this.topicConfigurationMessageInBase64);
            }
            return this.crypto.getTopicEncryptionKeyAndInitVector(this.topicConfigurationMessageInBase64, privateKey);
        });
    }
    setTopicConfigurationMessageInBase64(topicId) {
        return __awaiter(this, void 0, void 0, function* () {
            const topicMemoObject = yield this.getTopicMemo(topicId);
            let topicConfigurationMessageInBase64;
            // Topic memo specifies that topic configuration message is stored using the File Service
            if (topicMemoObject.s.c.u) {
                if (!topicMemoObject.s.c.i) {
                    throw new Error('Topic memo object does not specify file Id');
                }
                topicConfigurationMessageInBase64 = yield this.getFileContentsInBase64(topicMemoObject.s.c.i);
                // Topic memo specifies that topic configuration message is stored using the Consensus Service
            }
            else {
                topicConfigurationMessageInBase64 = yield this.getMessageFromTopicInBase64(topicId, 1);
                topicConfigurationMessageInBase64 = Buffer.from(topicConfigurationMessageInBase64, 'base64').toString('utf8');
            }
            topicConfigurationMessageInBase64 = Buffer.from(topicConfigurationMessageInBase64, 'base64').toString('utf8');
            this.topicConfigurationMessageInBase64 = Buffer.from(topicConfigurationMessageInBase64).toString('base64');
        });
    }
    initializeCryptoWithTopicConfiguration(topicConfigurationMessageInBase64) {
        return __awaiter(this, void 0, void 0, function* () {
            const topicConfigurationMessage = JSON.parse(Buffer.from(topicConfigurationMessageInBase64, 'base64').toString('utf8'));
            const topicEncryptionConfiguration = JSON.parse(Buffer.from(topicConfigurationMessage.b, 'base64').toString('utf8'));
            this.crypto = new Crypto_1.Crypto(topicEncryptionConfiguration.a, topicEncryptionConfiguration.s);
        });
    }
    getTopicSubmitKey(topicId, privateKey) {
        return __awaiter(this, void 0, void 0, function* () {
            const topicConfigurationObject = yield this.getConfiguration(topicId, privateKey);
            return topicConfigurationObject.s;
        });
    }
    getFileContentsInBase64(fileId) {
        return __awaiter(this, void 0, void 0, function* () {
            const fileGetContentsQuery = new sdk_1.FileContentsQuery({
                fileId: fileId
            });
            const fileContentsUint8Array = yield fileGetContentsQuery.execute(this.client);
            let fileContentsString = fileContentsUint8Array.toString();
            return fileContentsString;
        });
    }
    getMessageFromTopicInBase64(topicId, sequenceNumber) {
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
module.exports = {
    EncryptedTopic,
    EncryptionAlgorithm: EncryptionAlgorithm_1.EncryptionAlgorithm,
    StorageOptions: StorageOptions_1.StorageOptions
};
//# sourceMappingURL=index.js.map