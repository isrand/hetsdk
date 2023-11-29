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
class EncryptedTopic {
    /*

    --- SDK PUBLIC METHODS ---

    */
    constructor(encryptedTopicConfiguration) {
        this.encryptedTopicConfiguration = encryptedTopicConfiguration;
        this.TOPIC_DATA_INDEX = 0;
        this.TOPIC_ENCRYPTION_ALGORITHM_INDEX = 1;
        this.TOPIC_ENCRYPTION_SIZE_INDEX = 2;
        this.TOPIC_ENCRYPTED_KEYS_INDEX = 3;
        this.client = sdk_1.Client.forTestnet().setOperator(encryptedTopicConfiguration.hederaAccountId, sdk_1.PrivateKey.fromString(encryptedTopicConfiguration.hederaPrivateKey));
        this.privateKey = encryptedTopicConfiguration.privateKey;
        this.topicId = encryptedTopicConfiguration.topicId;
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
            let topicConfigurationMessage = '';
            // Remove doubles from participants array
            const uniqueParticipantsArray = Array.from(new Set(createEncryptedTopicConfiguration.participants));
            const topicData = {
                s: submitKey,
                m: createEncryptedTopicConfiguration.metadata
            };
            const encryptedTopicDataInBase64 = this.crypto.symmetricEncrypt(JSON.stringify(topicData), topicEncryptionKey, topicEncryptionInitVector);
            topicConfigurationMessage += `${encryptedTopicDataInBase64}#${algorithm}#${size}#`;
            const encryptedTopicKeysObject = this.crypto.getEncryptedTopicKeysObject(topicEncryptionKey, topicEncryptionInitVector, uniqueParticipantsArray);
            for (let i = 0; i < createEncryptedTopicConfiguration.participants.length; i++) {
                let participantString = `${encryptedTopicKeysObject.a[i]}_${encryptedTopicKeysObject.b[i]}`;
                if (encryptedTopicKeysObject.c) {
                    participantString += `_${encryptedTopicKeysObject.c[i]}`;
                }
                topicConfigurationMessage += `${participantString}#`;
            }
            const topicConfigurationMessageInBase64 = Buffer.from(topicConfigurationMessage).toString('base64');
            try {
                // Use the File Service to store the topic configuration message
                if (createEncryptedTopicConfiguration.storageOptions.configuration === StorageOptions_1.StorageOptions.File) {
                    // Create the file containing the topic configuration message
                    const fileCreateTransaction = new sdk_1.FileCreateTransaction({
                        keys: [sdk_1.PrivateKey.fromString(this.encryptedTopicConfiguration.hederaPrivateKey).publicKey]
                    });
                    yield fileCreateTransaction.freezeWith(this.client);
                    yield fileCreateTransaction.sign(sdk_1.PrivateKey.fromString(this.encryptedTopicConfiguration.hederaPrivateKey));
                    const fileCreateTransactionResponse = yield fileCreateTransaction.execute(this.client);
                    const fileCreateTransactionReceipt = yield fileCreateTransactionResponse.getReceipt(this.client);
                    if (!fileCreateTransactionReceipt.fileId) {
                        throw new Error('Error while fetching file id from file creation transaction receipt');
                    }
                    const fileId = fileCreateTransactionReceipt.fileId.toString();
                    const fileUpdateTransaction = new sdk_1.FileUpdateTransaction({
                        fileId: fileId,
                        contents: topicConfigurationMessageInBase64,
                        keys: [sdk_1.PrivateKey.fromString(this.encryptedTopicConfiguration.hederaPrivateKey).publicKey]
                    });
                    yield fileUpdateTransaction.freezeWith(this.client);
                    yield fileUpdateTransaction.sign(sdk_1.PrivateKey.fromString(this.encryptedTopicConfiguration.hederaPrivateKey));
                    yield fileUpdateTransaction.execute(this.client);
                    // Create topic
                    const topicCreateTransaction = new sdk_1.TopicCreateTransaction({
                        adminKey: sdk_1.PrivateKey.fromString(this.encryptedTopicConfiguration.hederaPrivateKey),
                        autoRenewAccountId: this.encryptedTopicConfiguration.hederaAccountId
                    });
                    topicCreateTransaction.setSubmitKey(sdk_1.PrivateKey.fromString(submitKey));
                    // Store the participants in a separate topic if specified by the createEncryptedTopicConfiguration object
                    const participantsStorageTopicId = yield this.createParticipantsTopic(createEncryptedTopicConfiguration, submitKey);
                    const topicMemoObject = this.createMemoObject(createEncryptedTopicConfiguration.storageOptions, fileId, participantsStorageTopicId);
                    // Set the topic memo to point at the file containing the topic configuration message
                    topicCreateTransaction.setTopicMemo(JSON.stringify(topicMemoObject));
                    yield topicCreateTransaction.freezeWith(this.client);
                    yield topicCreateTransaction.sign(sdk_1.PrivateKey.fromString(this.encryptedTopicConfiguration.hederaPrivateKey));
                    const encryptedTopicCreationResponse = yield topicCreateTransaction.execute(this.client);
                    const encryptedTopicCreationReceipt = yield encryptedTopicCreationResponse.getReceipt(this.client);
                    if (!encryptedTopicCreationReceipt.topicId) {
                        throw new Error('Topic Id not found in encrypted topic creation transaction receipt.');
                    }
                    const topicId = encryptedTopicCreationReceipt.topicId.toString();
                    // Cache the topic memo object for future use
                    this.topicMemoObject = topicMemoObject;
                    // Cache the topic configuration message in base64 for future use
                    this.topicConfigurationMessage = topicConfigurationMessage;
                    this.topicId = topicId;
                    return this.topicId;
                }
                // Create topic
                const topicCreateTransaction = new sdk_1.TopicCreateTransaction({
                    adminKey: sdk_1.PrivateKey.fromString(this.encryptedTopicConfiguration.hederaPrivateKey),
                    autoRenewAccountId: this.encryptedTopicConfiguration.hederaAccountId
                });
                topicCreateTransaction.setSubmitKey(sdk_1.PrivateKey.fromString(submitKey));
                // Store the participants in a separate topic if specified by the createEncryptedTopicConfiguration object
                const participantsStorageTopicId = yield this.createParticipantsTopic(createEncryptedTopicConfiguration, submitKey);
                const topicMemoObject = this.createMemoObject(createEncryptedTopicConfiguration.storageOptions, undefined, participantsStorageTopicId);
                topicCreateTransaction.setTopicMemo(JSON.stringify(topicMemoObject));
                yield topicCreateTransaction.freezeWith(this.client);
                yield topicCreateTransaction.sign(sdk_1.PrivateKey.fromString(this.encryptedTopicConfiguration.hederaPrivateKey));
                const encryptedTopicCreationResponse = yield topicCreateTransaction.execute(this.client);
                const encryptedTopicCreationReceipt = yield encryptedTopicCreationResponse.getReceipt(this.client);
                if (!encryptedTopicCreationReceipt.topicId) {
                    throw new Error('Topic Id not found in encrypted topic creation transaction receipt.');
                }
                const topicId = encryptedTopicCreationReceipt.topicId.toString() || '';
                // Submit topic configuration message to topic
                const topicSubmitMessageTransaction = new sdk_1.TopicMessageSubmitTransaction({
                    topicId: topicId,
                    message: topicConfigurationMessageInBase64
                });
                yield topicSubmitMessageTransaction.freezeWith(this.client);
                yield topicSubmitMessageTransaction.sign(sdk_1.PrivateKey.fromString(submitKey));
                yield topicSubmitMessageTransaction.sign(sdk_1.PrivateKey.fromString(this.encryptedTopicConfiguration.hederaPrivateKey));
                yield topicSubmitMessageTransaction.execute(this.client);
                // Cache the topic memo object for future use
                this.topicMemoObject = topicMemoObject;
                // Cache the topic configuration message in base64 for future use
                this.topicConfigurationMessage = topicConfigurationMessage;
                this.topicId = topicId;
                return topicId;
            }
            catch (error) {
                console.error(error);
                throw error;
            }
        });
    }
    // "addParticipant" adds a new participant to the encrypted topic, and stores it in the participants topic if the
    // topic memo specifies it
    addParticipant(publicKey) {
        return __awaiter(this, void 0, void 0, function* () {
            // Get topic memo, check if topic configuration message is stored using the File Service
            const topicMemoObject = yield this.getMemo();
            // Throw error if topic doesn't allow for new participants (configuration is stored using Consensus Service)
            if (!topicMemoObject.s.c.f) {
                throw new Error('New participants can only be added to topics that use the File Service as storage medium for their configuration. Requested topic uses the Consensus Service.');
            }
            if (!topicMemoObject.s.c.i) {
                throw new Error('Topic memo object does not specify configuration file Id');
            }
            const algorithm = yield this.getTopicEncryptionAlgorithmFromTopicConfigurationMessage();
            const size = yield this.getTopicEncryptionSizeFromTopicConfigurationMessage();
            this.crypto.validateParticipantKeys([publicKey], size);
            // Get topic encryption key and init vector
            const topicEncryptionKeyAndInitVector = yield this.getEncryptionKeyAndInitVector();
            // Encrypt topic encryption key and init vector with new participant public keys
            const newEncryptedTopicEncryptionKeyAndInitVectors = this.crypto.getEncryptedTopicKeysObject(Buffer.from(topicEncryptionKeyAndInitVector.encryptionKey, 'base64'), Buffer.from(topicEncryptionKeyAndInitVector.initVector, 'base64'), [publicKey]);
            let newEncryptedTopicEncryptionKeyAndInitVectorsString = `${newEncryptedTopicEncryptionKeyAndInitVectors.a[0]}_${newEncryptedTopicEncryptionKeyAndInitVectors.b[0]}`;
            if (algorithm === 'kyber' && newEncryptedTopicEncryptionKeyAndInitVectors.c) {
                newEncryptedTopicEncryptionKeyAndInitVectorsString += `_${newEncryptedTopicEncryptionKeyAndInitVectors.c[0]}#`;
            }
            // Update file
            const fileAppendTransaction = new sdk_1.FileAppendTransaction({
                fileId: topicMemoObject.s.c.i,
                contents: Buffer.from(newEncryptedTopicEncryptionKeyAndInitVectorsString).toString('base64')
            });
            yield fileAppendTransaction.freezeWith(this.client);
            yield fileAppendTransaction.sign(sdk_1.PrivateKey.fromString(this.encryptedTopicConfiguration.hederaPrivateKey));
            yield fileAppendTransaction.execute(this.client);
            // Store participant in the participants topic
            if (topicMemoObject.s.p.p) {
                const submitKey = yield this.getSubmitKey();
                const topicSubmitMessageTransaction = new sdk_1.TopicMessageSubmitTransaction({
                    topicId: topicMemoObject.s.p.i,
                    message: publicKey,
                });
                yield topicSubmitMessageTransaction.freezeWith(this.client);
                yield topicSubmitMessageTransaction.sign(sdk_1.PrivateKey.fromString(submitKey));
                yield topicSubmitMessageTransaction.sign(sdk_1.PrivateKey.fromString(this.encryptedTopicConfiguration.hederaPrivateKey));
                yield topicSubmitMessageTransaction.execute(this.client);
            }
            // Update cached topic configuration message in base 64
            this.topicConfigurationMessage = this.topicConfigurationMessage + newEncryptedTopicEncryptionKeyAndInitVectorsString;
            return;
        });
    }
    // "submitMessage" submits a message on an encrypted topic (if the user has access)
    // and returns the sequence number of the message
    submitMessage(message) {
        return __awaiter(this, void 0, void 0, function* () {
            const topicMemoObject = yield this.getMemo();
            const topicEncryptionKeyAndInitVector = yield this.getEncryptionKeyAndInitVector();
            const messageEncryptionKey = Buffer.from(crypto.randomBytes(32));
            const messageEncryptionInitVector = Buffer.from(crypto.randomBytes(16));
            const encryptedMessage = this.crypto.symmetricEncrypt(message, messageEncryptionKey, messageEncryptionInitVector);
            const finalMessage = {
                m: encryptedMessage,
                k: this.crypto.symmetricEncrypt(Buffer.from(messageEncryptionKey).toString('base64'), Buffer.from(topicEncryptionKeyAndInitVector.encryptionKey, 'base64'), Buffer.from(topicEncryptionKeyAndInitVector.initVector, 'base64')),
                i: this.crypto.symmetricEncrypt(Buffer.from(messageEncryptionInitVector).toString('base64'), Buffer.from(topicEncryptionKeyAndInitVector.encryptionKey, 'base64'), Buffer.from(topicEncryptionKeyAndInitVector.initVector, 'base64'))
            };
            const finalMessageInBase64 = Buffer.from(JSON.stringify(finalMessage)).toString('base64');
            const submitKey = yield this.getSubmitKey();
            // Topic memo specifies that topic messages should be stored using the File Service
            if (topicMemoObject.s.m.f) {
                const fileCreateTransaction = new sdk_1.FileCreateTransaction({
                    keys: [sdk_1.PrivateKey.fromString(this.encryptedTopicConfiguration.hederaPrivateKey).publicKey]
                });
                yield fileCreateTransaction.freezeWith(this.client);
                yield fileCreateTransaction.sign(sdk_1.PrivateKey.fromString(this.encryptedTopicConfiguration.hederaPrivateKey));
                const fileCreateTransactionResponse = yield fileCreateTransaction.execute(this.client);
                const fileCreateTransactionReceipt = yield fileCreateTransactionResponse.getReceipt(this.client);
                if (!fileCreateTransactionReceipt.fileId) {
                    throw new Error('Error while fetching file id from file creation transaction receipt');
                }
                const fileId = fileCreateTransactionReceipt.fileId.toString();
                const fileUpdateTransaction = new sdk_1.FileUpdateTransaction({
                    fileId: fileId,
                    contents: finalMessageInBase64,
                    keys: [sdk_1.PrivateKey.fromString(this.encryptedTopicConfiguration.hederaPrivateKey).publicKey]
                });
                yield fileUpdateTransaction.freezeWith(this.client);
                yield fileUpdateTransaction.sign(sdk_1.PrivateKey.fromString(this.encryptedTopicConfiguration.hederaPrivateKey));
                yield fileUpdateTransaction.execute(this.client);
                const transaction = yield new sdk_1.TopicMessageSubmitTransaction({
                    topicId: this.topicId,
                    message: Buffer.from(fileId).toString('base64')
                });
                yield transaction.freezeWith(this.client);
                yield transaction.sign(sdk_1.PrivateKey.fromString(this.encryptedTopicConfiguration.hederaPrivateKey));
                yield transaction.sign(sdk_1.PrivateKey.fromString(submitKey));
                const result = yield transaction.execute(this.client);
                const receipt = yield result.getReceipt(this.client);
                return receipt.topicSequenceNumber.toNumber();
            }
            const transaction = yield new sdk_1.TopicMessageSubmitTransaction({
                topicId: this.topicId,
                message: finalMessageInBase64
            });
            yield transaction.freezeWith(this.client);
            yield transaction.sign(sdk_1.PrivateKey.fromString(this.encryptedTopicConfiguration.hederaPrivateKey));
            yield transaction.sign(sdk_1.PrivateKey.fromString(submitKey));
            const result = yield transaction.execute(this.client);
            const receipt = yield result.getReceipt(this.client);
            return receipt.topicSequenceNumber.toNumber();
        });
    }
    // "getMessage" gets a message from an encrypted topic (if the user has access)
    getMessage(sequenceNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            const topicMemoObject = yield this.getMemo();
            const topicEncryptionKeyAndInitVector = yield this.getEncryptionKeyAndInitVector();
            // Topic memo specifies that topic messages should be stored using the File Service
            if (topicMemoObject.s.m.f) {
                const messageFileIdInBase64 = yield this.getMessageFromTopicInBase64(sequenceNumber);
                let fileId = Buffer.from(messageFileIdInBase64, 'base64').toString('utf8');
                const encryptedMessageInBase64 = yield this.getFileContentsInBase64(Buffer.from(fileId, 'base64').toString('utf8'));
                const encryptedMessage = JSON.parse(Buffer.from(encryptedMessageInBase64, 'base64').toString('utf8'));
                const decryptedMessageEncryptionKey = Buffer.from(this.crypto.symmetricDecrypt(encryptedMessage.k, Buffer.from(topicEncryptionKeyAndInitVector.encryptionKey, 'base64'), Buffer.from(topicEncryptionKeyAndInitVector.initVector, 'base64')), 'base64');
                const decryptedMessageInitVector = Buffer.from(this.crypto.symmetricDecrypt(encryptedMessage.i, Buffer.from(topicEncryptionKeyAndInitVector.encryptionKey, 'base64'), Buffer.from(topicEncryptionKeyAndInitVector.initVector, 'base64')), 'base64');
                return this.crypto.symmetricDecrypt(encryptedMessage.m, decryptedMessageEncryptionKey, decryptedMessageInitVector);
            }
            let encryptedMessageInBase64 = yield this.getMessageFromTopicInBase64(sequenceNumber);
            encryptedMessageInBase64 = Buffer.from(encryptedMessageInBase64, 'base64').toString('utf8');
            const encryptedMessage = JSON.parse(Buffer.from(encryptedMessageInBase64, 'base64').toString('utf8'));
            const decryptedMessageEncryptionKey = Buffer.from(this.crypto.symmetricDecrypt(encryptedMessage.k, Buffer.from(topicEncryptionKeyAndInitVector.encryptionKey, 'base64'), Buffer.from(topicEncryptionKeyAndInitVector.initVector, 'base64')), 'base64');
            const decryptedMessageInitVector = Buffer.from(this.crypto.symmetricDecrypt(encryptedMessage.i, Buffer.from(topicEncryptionKeyAndInitVector.encryptionKey, 'base64'), Buffer.from(topicEncryptionKeyAndInitVector.initVector, 'base64')), 'base64');
            return this.crypto.symmetricDecrypt(encryptedMessage.m, decryptedMessageEncryptionKey, decryptedMessageInitVector);
        });
    }
    /*

    --- SDK INTERNAL METHODS ---

    */
    createMemoObject(topicStorageOptions, topicConfigurationFileId, participantsTopicId) {
        return {
            s: {
                c: {
                    i: topicConfigurationFileId || undefined,
                    f: topicStorageOptions.configuration === StorageOptions_1.StorageOptions.File,
                },
                m: {
                    f: topicStorageOptions.messages === StorageOptions_1.StorageOptions.File
                },
                p: {
                    p: topicStorageOptions.storeParticipants,
                    i: participantsTopicId || undefined
                }
            }
        };
    }
    createParticipantsTopic(createEncryptedTopicConfiguration, submitKey) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!createEncryptedTopicConfiguration.storageOptions.storeParticipants) {
                return undefined;
            }
            const topicCreateTransaction = new sdk_1.TopicCreateTransaction({
                adminKey: sdk_1.PrivateKey.fromString(this.encryptedTopicConfiguration.hederaPrivateKey),
                autoRenewAccountId: this.encryptedTopicConfiguration.hederaAccountId
            });
            topicCreateTransaction.setSubmitKey(sdk_1.PrivateKey.fromString(submitKey));
            yield topicCreateTransaction.freezeWith(this.client);
            yield topicCreateTransaction.sign(sdk_1.PrivateKey.fromString(this.encryptedTopicConfiguration.hederaPrivateKey));
            const participantsTopicCreationResponse = yield topicCreateTransaction.execute(this.client);
            const participantsTopicCreationReceipt = yield participantsTopicCreationResponse.getReceipt(this.client);
            if (!participantsTopicCreationReceipt.topicId) {
                throw new Error('Topic Id not found in encrypted topic creation transaction receipt.');
            }
            const topicId = participantsTopicCreationReceipt.topicId.toString() || '';
            for (const publicKey of createEncryptedTopicConfiguration.participants) {
                const topicSubmitMessageTransaction = new sdk_1.TopicMessageSubmitTransaction({
                    topicId: topicId,
                    message: publicKey,
                });
                yield topicSubmitMessageTransaction.freezeWith(this.client);
                yield topicSubmitMessageTransaction.sign(sdk_1.PrivateKey.fromString(submitKey));
                yield topicSubmitMessageTransaction.sign(sdk_1.PrivateKey.fromString(this.encryptedTopicConfiguration.hederaPrivateKey));
                yield topicSubmitMessageTransaction.execute(this.client);
            }
            return topicId;
        });
    }
    getEncryptedTopicKeysObjectFromTopicConfigurationMessage() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.topicConfigurationMessage) {
                yield this.setConfigurationMessage();
            }
            let encryptedTopicKeysObjectArray = this.topicConfigurationMessage.split('#');
            encryptedTopicKeysObjectArray = encryptedTopicKeysObjectArray.slice(this.TOPIC_ENCRYPTED_KEYS_INDEX);
            const encryptedTopicKeysObject = {
                a: [],
                b: [],
            };
            const algorithm = yield this.getTopicEncryptionAlgorithmFromTopicConfigurationMessage();
            if (algorithm === 'kyber') {
                encryptedTopicKeysObject.c = [];
            }
            for (const participant of encryptedTopicKeysObjectArray) {
                const participantEncryptionData = participant.split('_');
                if (participantEncryptionData[0]) {
                    encryptedTopicKeysObject.a.push(participantEncryptionData[0]);
                }
                if (participantEncryptionData[1]) {
                    encryptedTopicKeysObject.b.push(participantEncryptionData[1]);
                }
                if (encryptedTopicKeysObject.c && participantEncryptionData[2]) {
                    encryptedTopicKeysObject.c.push(participantEncryptionData[2]);
                }
            }
            return encryptedTopicKeysObject;
        });
    }
    getTopicEncryptionAlgorithmFromTopicConfigurationMessage() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.topicConfigurationMessage) {
                yield this.setConfigurationMessage();
            }
            return this.topicConfigurationMessage.split('#')[this.TOPIC_ENCRYPTION_ALGORITHM_INDEX];
        });
    }
    getTopicEncryptionSizeFromTopicConfigurationMessage() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.topicConfigurationMessage) {
                yield this.setConfigurationMessage();
            }
            return Number(this.topicConfigurationMessage.split('#')[this.TOPIC_ENCRYPTION_SIZE_INDEX]);
        });
    }
    getMemo() {
        return __awaiter(this, void 0, void 0, function* () {
            // Make sure the topicId variable is set before starting...
            if (!this.topicId) {
                throw new Error('Topic ID not set in constructor. Please provide a topic for the SDK to target.');
            }
            if (!this.topicMemoObject) {
                const topicInfo = new sdk_1.TopicInfoQuery({
                    topicId: this.topicId
                });
                const topicInfoResponse = yield topicInfo.execute(this.client);
                this.topicMemoObject = JSON.parse(topicInfoResponse.topicMemo);
            }
            return this.topicMemoObject;
        });
    }
    getEncryptionKeyAndInitVector() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.topicConfigurationMessage) {
                yield this.setConfigurationMessage();
            }
            if (!this.crypto) {
                yield this.initializeCrypto();
            }
            const encryptedTopicKeysObject = yield this.getEncryptedTopicKeysObjectFromTopicConfigurationMessage();
            return this.crypto.getTopicEncryptionKeyAndInitVector(encryptedTopicKeysObject, this.privateKey);
        });
    }
    setConfigurationMessage() {
        return __awaiter(this, void 0, void 0, function* () {
            const topicMemoObject = yield this.getMemo();
            let topicConfigurationMessage;
            // Topic memo specifies that topic configuration message is stored using the File Service
            if (topicMemoObject.s.c.f) {
                if (!topicMemoObject.s.c.i) {
                    throw new Error('Topic memo object does not specify file Id');
                }
                topicConfigurationMessage = yield this.getFileContentsInBase64(topicMemoObject.s.c.i);
                // Topic memo specifies that topic configuration message is stored using the Consensus Service
            }
            else {
                topicConfigurationMessage = yield this.getMessageFromTopicInBase64(1);
            }
            this.topicConfigurationMessage = Buffer.from(topicConfigurationMessage, 'base64').toString('utf8');
        });
    }
    initializeCrypto() {
        return __awaiter(this, void 0, void 0, function* () {
            this.crypto = new Crypto_1.Crypto(yield this.getTopicEncryptionAlgorithmFromTopicConfigurationMessage(), yield this.getTopicEncryptionSizeFromTopicConfigurationMessage());
        });
    }
    getSubmitKey() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.topicConfigurationMessage) {
                yield this.setConfigurationMessage();
            }
            if (!this.crypto) {
                yield this.initializeCrypto();
            }
            const encryptedTopicDataInBase64 = this.topicConfigurationMessage.split('#')[this.TOPIC_DATA_INDEX];
            const encryptedTopicKeysObject = yield this.getEncryptedTopicKeysObjectFromTopicConfigurationMessage();
            const topicConfigurationObject = this.crypto.decryptTopicData(encryptedTopicKeysObject, encryptedTopicDataInBase64, this.privateKey);
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
    getMessageFromTopicInBase64(sequenceNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            // Make sure the topicId variable is set before starting...
            if (!this.topicId) {
                throw new Error('Topic ID not set in constructor. Please provide a topic for the SDK to target.');
            }
            // First, check if topic has messages up to "sequenceNumber"
            const topicInfo = new sdk_1.TopicInfoQuery({
                topicId: this.topicId
            });
            const topicInfoResponse = yield topicInfo.execute(this.client);
            if (Number(sequenceNumber) > topicInfoResponse.sequenceNumber.toNumber()) {
                throw new Error('Topic sequence number is less than the one provided.');
            }
            const topicMessageQuery = new sdk_1.TopicMessageQuery({
                topicId: this.topicId
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