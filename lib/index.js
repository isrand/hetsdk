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
const StorageOptions_1 = require("./hedera/enums/StorageOptions");
const HederaStub_1 = require("./hedera/HederaStub");
const crypto = __importStar(require("crypto"));
const TopicConfigurationMessageIndexes_1 = require("./hedera/enums/TopicConfigurationMessageIndexes");
class EncryptedTopic {
    /*

    --- SDK PUBLIC METHODS ---

    */
    constructor(encryptedTopicConfiguration) {
        this.encryptedTopicConfiguration = encryptedTopicConfiguration;
        this.hederaStub = new HederaStub_1.HederaStub(sdk_1.Client.forTestnet().setOperator(encryptedTopicConfiguration.hederaAccountId, sdk_1.PrivateKey.fromString(encryptedTopicConfiguration.hederaPrivateKey)), this.encryptedTopicConfiguration.hederaPrivateKey, this.encryptedTopicConfiguration.hederaAccountId);
        this.privateKey = encryptedTopicConfiguration.privateKey;
        this.topicId = encryptedTopicConfiguration.topicId;
    }
    // "generateKeyPair" allows the user to create a public / private key pair should they not have one already,
    // with the algorithm and key size of their choosing, without the need to initialize the EncryptedTopic object
    static generateKeyPair(algorithm) {
        return new Crypto_1.Crypto(algorithm.split('-')[0], parseInt(algorithm.split('-')[1])).generateKeyPair();
    }
    // "create" creates a new encrypted topic in the Hedera network
    create(createEncryptedTopicConfiguration) {
        return __awaiter(this, void 0, void 0, function* () {
            const submitKey = sdk_1.PrivateKey.generateED25519().toStringRaw();
            this.topicConfigurationMessage = this.createTopicConfigurationMessage({
                submitKey: submitKey,
                algorithm: createEncryptedTopicConfiguration.algorithm.split('-')[0],
                size: parseInt(createEncryptedTopicConfiguration.algorithm.split('-')[1]),
                participants: Array.from(new Set(createEncryptedTopicConfiguration.participants)),
                metadata: createEncryptedTopicConfiguration.metadata
            });
            let fileId = undefined;
            if (createEncryptedTopicConfiguration.storageOptions.configuration === StorageOptions_1.StorageOptions.File) {
                fileId = yield this.hederaStub.createFile();
                yield this.hederaStub.appendToFile(fileId, this.topicConfigurationMessage);
            }
            let participantsTopicId = undefined;
            if (createEncryptedTopicConfiguration.storageOptions.storeParticipants) {
                participantsTopicId = yield this.createParticipantsTopic(submitKey, createEncryptedTopicConfiguration);
            }
            this.topicMemoObject = this.createMemoObject(createEncryptedTopicConfiguration.storageOptions, fileId, participantsTopicId);
            this.topicId = yield this.hederaStub.createTopic(submitKey, this.topicMemoObject);
            if (createEncryptedTopicConfiguration.storageOptions.configuration === StorageOptions_1.StorageOptions.Message) {
                yield this.hederaStub.submitMessageToTopic(submitKey, this.topicId, Buffer.from(this.topicConfigurationMessage).toString('base64'));
            }
            return this.topicId;
        });
    }
    // "addParticipant" adds a new participant to the encrypted topic, and stores it in the participants topic if the
    // topic memo specifies it
    addParticipant(publicKey, forwardSecrecy) {
        return __awaiter(this, void 0, void 0, function* () {
            if (forwardSecrecy) {
                yield this.rotateEncryptionKey();
            }
            yield this.setMemo();
            if (!this.topicMemoObject.s.c.f) {
                throw new Error('New participants can only be added to topics that use the File Service as storage medium for their configuration. Requested topic uses the Consensus Service.');
            }
            if (!this.topicMemoObject.s.c.i) {
                throw new Error('Topic memo object does not specify configuration file Id');
            }
            const currentConfigurationMessageVersion = yield this.getCurrentTopicConfigurationMessageVersion();
            const algorithm = yield this.getEncryptionAlgorithmFromConfigurationMessage();
            const size = yield this.getEncryptionSizeFromConfigurationMessage();
            this.crypto.validateParticipantKeys([publicKey], size);
            const topicEncryptionKeyAndInitVector = yield this.getEncryptionKeyAndInitVector(currentConfigurationMessageVersion);
            const newEncryptedTopicEncryptionKeyAndInitVectors = this.crypto.getEncryptedTopicKeysObject(Buffer.from(topicEncryptionKeyAndInitVector.encryptionKey, 'base64'), Buffer.from(topicEncryptionKeyAndInitVector.initVector, 'base64'), [publicKey]);
            let newEncryptedTopicEncryptionKeyAndInitVectorsString = `${newEncryptedTopicEncryptionKeyAndInitVectors.a[0]}_${newEncryptedTopicEncryptionKeyAndInitVectors.b[0]}`;
            if (algorithm === 'kyber' && newEncryptedTopicEncryptionKeyAndInitVectors.c) {
                newEncryptedTopicEncryptionKeyAndInitVectorsString += `_${newEncryptedTopicEncryptionKeyAndInitVectors.c[0]}#`;
            }
            yield this.hederaStub.appendToFile(this.topicMemoObject.s.c.i, newEncryptedTopicEncryptionKeyAndInitVectorsString);
            if (this.topicMemoObject.s.p.p) {
                const submitKey = yield this.getSubmitKey(currentConfigurationMessageVersion);
                yield this.hederaStub.submitMessageToTopic(submitKey, this.topicMemoObject.s.p.i, publicKey);
            }
            this.topicConfigurationMessage = this.topicConfigurationMessage + newEncryptedTopicEncryptionKeyAndInitVectorsString;
            return;
        });
    }
    // "submitMessage" submits a message on an encrypted topic (if the user has access)
    // and returns the sequence number of the message
    submitMessage(message) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.setMemo();
            yield this.setConfigurationMessage();
            const currentConfigurationMessageVersion = yield this.getCurrentTopicConfigurationMessageVersion();
            const finalMessageInBase64 = yield this.createTopicMessage(message, currentConfigurationMessageVersion);
            const submitKey = yield this.getSubmitKey(currentConfigurationMessageVersion);
            if (this.topicMemoObject.s.m.f) {
                const fileId = yield this.hederaStub.createFile();
                yield this.hederaStub.appendToFile(fileId, finalMessageInBase64);
                return yield this.hederaStub.submitMessageToTopic(submitKey, this.topicId, Buffer.from(fileId).toString('base64'));
            }
            return yield this.hederaStub.submitMessageToTopic(submitKey, this.topicId, finalMessageInBase64);
        });
    }
    // "getMessage" gets a message from an encrypted topic (if the user has access)
    getMessage(sequenceNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.setMemo();
            let encryptedMessageInBase64;
            if (this.topicMemoObject.s.m.f) {
                const messageFileIdInBase64 = yield this.getMessageFromTopic(sequenceNumber);
                let fileId = Buffer.from(messageFileIdInBase64, 'base64').toString('utf8');
                encryptedMessageInBase64 = yield this.hederaStub.getFileContents(Buffer.from(fileId, 'base64').toString('utf8'));
            }
            else {
                encryptedMessageInBase64 = yield this.getMessageFromTopic(sequenceNumber);
                encryptedMessageInBase64 = Buffer.from(encryptedMessageInBase64, 'base64').toString('utf8');
            }
            const encryptedMessage = JSON.parse(Buffer.from(encryptedMessageInBase64, 'base64').toString('utf8'));
            const topicEncryptionKeyAndInitVector = yield this.getEncryptionKeyAndInitVector(encryptedMessage.v);
            const decryptedMessageEncryptionKey = Buffer.from(this.crypto.symmetricDecrypt(encryptedMessage.k, Buffer.from(topicEncryptionKeyAndInitVector.encryptionKey, 'base64'), Buffer.from(topicEncryptionKeyAndInitVector.initVector, 'base64')), 'base64');
            const decryptedMessageInitVector = Buffer.from(this.crypto.symmetricDecrypt(encryptedMessage.i, Buffer.from(topicEncryptionKeyAndInitVector.encryptionKey, 'base64'), Buffer.from(topicEncryptionKeyAndInitVector.initVector, 'base64')), 'base64');
            return this.crypto.symmetricDecrypt(encryptedMessage.m, decryptedMessageEncryptionKey, decryptedMessageInitVector);
        });
    }
    // "getParticipants" returns the list of participants that are part of the topic, if the encrypted
    // topic admin chose to store them upon creation
    getParticipants() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.setMemo();
            if (!this.topicMemoObject.s.p.p) {
                throw new Error('Topic did not choose to store participants upon creation, cannot fetch list of participants.');
            }
            if (!this.topicMemoObject.s.p.i) {
                throw new Error('Topic memo does not specify participants storage topic Id.');
            }
            const topicInfo = yield this.hederaStub.getTopicInfo(this.topicMemoObject.s.p.i);
            const sequenceNumber = topicInfo.sequenceNumber.toNumber();
            const participants = [];
            for (let i = 1; i <= sequenceNumber; i++) {
                const participant = yield this.hederaStub.getMessageFromTopic(this.topicMemoObject.s.p.i, i);
                participants.push(Buffer.from(participant, 'base64').toString('utf8'));
            }
            return Array.from(new Set(participants));
        });
    }
    // "rotateEncryptionKey" allows the topic administrator to rotate its encryption key and re-encrypt it with
    // every participant's public key, appending the new configuration message to the old one
    rotateEncryptionKey() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.setMemo();
            if (!this.topicMemoObject.s.c.f) {
                throw new Error('Topic encryption key rotation is only available in encrypted topics that use the File Service as storage medium for their configuration. Requested topic uses the Consensus Service.');
            }
            if (!this.topicMemoObject.s.c.i) {
                throw new Error('Topic memo object does not specify configuration file Id.');
            }
            if (!this.topicMemoObject.s.p.p) {
                throw new Error('Topic did not choose to store participants upon creation, topic encryption key rotation is not possible.');
            }
            const currentVersion = yield this.getCurrentTopicConfigurationMessageVersion();
            const participants = yield this.getParticipants();
            const topicData = yield this.getTopicData(currentVersion);
            const algorithm = yield this.getEncryptionAlgorithmFromConfigurationMessage();
            const size = yield this.getEncryptionSizeFromConfigurationMessage();
            const newTopicConfigurationMessage = this.createTopicConfigurationMessage({
                submitKey: topicData.s,
                metadata: topicData.m,
                participants: participants,
                size: size,
                algorithm: algorithm
            });
            const newTopicConfigurationString = `,${newTopicConfigurationMessage}`;
            yield this.hederaStub.appendToFile(this.topicMemoObject.s.c.i, newTopicConfigurationString);
        });
    }
    /*

    --- SDK INTERNAL METHODS ---

    */
    createTopicMessage(message, currentConfigurationMessageVersion) {
        return __awaiter(this, void 0, void 0, function* () {
            const topicEncryptionKeyAndInitVector = yield this.getEncryptionKeyAndInitVector(currentConfigurationMessageVersion);
            const messageEncryptionKey = Buffer.from(crypto.randomBytes(32));
            const messageEncryptionInitVector = Buffer.from(crypto.randomBytes(16));
            const finalMessage = {
                m: this.crypto.symmetricEncrypt(message, messageEncryptionKey, messageEncryptionInitVector),
                k: this.crypto.symmetricEncrypt(Buffer.from(messageEncryptionKey).toString('base64'), Buffer.from(topicEncryptionKeyAndInitVector.encryptionKey, 'base64'), Buffer.from(topicEncryptionKeyAndInitVector.initVector, 'base64')),
                i: this.crypto.symmetricEncrypt(Buffer.from(messageEncryptionInitVector).toString('base64'), Buffer.from(topicEncryptionKeyAndInitVector.encryptionKey, 'base64'), Buffer.from(topicEncryptionKeyAndInitVector.initVector, 'base64')),
                v: currentConfigurationMessageVersion
            };
            return Buffer.from(JSON.stringify(finalMessage)).toString('base64');
        });
    }
    createTopicConfigurationMessage(topicConfigurationMessageParameters) {
        const algorithm = topicConfigurationMessageParameters.algorithm;
        const size = topicConfigurationMessageParameters.size;
        const participants = topicConfigurationMessageParameters.participants;
        const topicData = { s: topicConfigurationMessageParameters.submitKey, m: topicConfigurationMessageParameters.metadata };
        const topicEncryptionKey = Buffer.from(crypto.randomBytes(32));
        const topicEncryptionInitVector = Buffer.from(crypto.randomBytes(16));
        this.crypto = new Crypto_1.Crypto(algorithm, size);
        this.crypto.validateParticipantKeys(participants, size);
        const encryptedTopicDataInBase64 = this.crypto.symmetricEncrypt(JSON.stringify(topicData), topicEncryptionKey, topicEncryptionInitVector);
        let topicConfigurationMessage = `${encryptedTopicDataInBase64}#${algorithm}#${size}#`;
        const encryptedTopicKeysObject = this.crypto.getEncryptedTopicKeysObject(topicEncryptionKey, topicEncryptionInitVector, participants);
        for (let i = 0; i < participants.length; i++) {
            let participantString = `${encryptedTopicKeysObject.a[i]}_${encryptedTopicKeysObject.b[i]}`;
            if (encryptedTopicKeysObject.c) {
                participantString += `_${encryptedTopicKeysObject.c[i]}`;
            }
            topicConfigurationMessage += `${participantString}#`;
        }
        return topicConfigurationMessage;
    }
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
    getCurrentTopicConfigurationMessageVersion() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.setConfigurationMessage();
            const currentTopicConfigurationMessage = this.topicConfigurationMessage.split(',').filter((elem) => {
                return elem !== '';
            });
            return currentTopicConfigurationMessage.length - 1;
        });
    }
    createParticipantsTopic(submitKey, createEncryptedTopicConfiguration) {
        return __awaiter(this, void 0, void 0, function* () {
            const topicId = yield this.hederaStub.createTopic(submitKey);
            const participants = Array.from(new Set(createEncryptedTopicConfiguration.participants));
            for (const publicKey of participants) {
                yield this.hederaStub.submitMessageToTopic(submitKey, topicId, publicKey);
            }
            return topicId;
        });
    }
    getEncryptionAlgorithmFromConfigurationMessage() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.setConfigurationMessage();
            const currentTopicConfigurationMessage = this.topicConfigurationMessage.split(',').filter((elem) => {
                return elem !== '';
            });
            return currentTopicConfigurationMessage[currentTopicConfigurationMessage.length - 1].split('#')[TopicConfigurationMessageIndexes_1.TopicConfigurationMessageIndexes.TOPIC_ENCRYPTION_ALGORITHM_INDEX];
        });
    }
    getEncryptionSizeFromConfigurationMessage() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.setConfigurationMessage();
            const currentTopicConfigurationMessage = this.topicConfigurationMessage.split(',').filter((elem) => {
                return elem !== '';
            });
            return Number(currentTopicConfigurationMessage[currentTopicConfigurationMessage.length - 1].split('#')[TopicConfigurationMessageIndexes_1.TopicConfigurationMessageIndexes.TOPIC_ENCRYPTION_SIZE_INDEX]);
        });
    }
    setMemo() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.topicId) {
                throw new Error('Topic ID not set in constructor. Please provide a topic for the SDK to target.');
            }
            if (!this.topicMemoObject) {
                const topicInfo = yield this.hederaStub.getTopicInfo(this.topicId);
                this.topicMemoObject = JSON.parse(topicInfo.topicMemo);
            }
        });
    }
    getEncryptionKeyAndInitVector(version) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.setConfigurationMessage();
            yield this.initializeCrypto();
            const encryptedTopicKeysObject = yield this.getEncryptedTopicKeysObjectFromTopicConfigurationMessage(version);
            return this.crypto.getTopicEncryptionKeyAndInitVector(encryptedTopicKeysObject, this.privateKey);
        });
    }
    setConfigurationMessage() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.setMemo();
            let topicConfigurationMessage;
            // Topic memo specifies that topic configuration message is stored using the File Service
            if (this.topicMemoObject.s.c.f) {
                if (!this.topicMemoObject.s.c.i) {
                    throw new Error('Topic memo object does not specify file Id');
                }
                this.topicConfigurationMessage = yield this.hederaStub.getFileContents(this.topicMemoObject.s.c.i);
                // Topic memo specifies that topic configuration message is stored using the Consensus Service
            }
            else {
                topicConfigurationMessage = yield this.getMessageFromTopic(1);
                this.topicConfigurationMessage = Buffer.from(topicConfigurationMessage, 'base64').toString('utf8');
            }
        });
    }
    initializeCrypto() {
        return __awaiter(this, void 0, void 0, function* () {
            this.crypto = new Crypto_1.Crypto(yield this.getEncryptionAlgorithmFromConfigurationMessage(), yield this.getEncryptionSizeFromConfigurationMessage());
        });
    }
    getTopicData(version) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.setConfigurationMessage();
            yield this.initializeCrypto();
            const currentTopicConfigurationMessage = this.topicConfigurationMessage.split(',').filter((elem) => {
                return elem !== '';
            });
            const encryptedTopicDataInBase64 = currentTopicConfigurationMessage[version].split('#')[TopicConfigurationMessageIndexes_1.TopicConfigurationMessageIndexes.TOPIC_DATA_INDEX];
            const encryptedTopicKeysObject = yield this.getEncryptedTopicKeysObjectFromTopicConfigurationMessage(version);
            const topicData = this.crypto.decryptTopicData(encryptedTopicKeysObject, encryptedTopicDataInBase64, this.privateKey);
            return topicData;
        });
    }
    getSubmitKey(version) {
        return __awaiter(this, void 0, void 0, function* () {
            const topicData = yield this.getTopicData(version);
            return topicData.s;
        });
    }
    getEncryptedTopicKeysObjectFromTopicConfigurationMessage(version) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.setConfigurationMessage();
            const currentTopicConfigurationMessage = this.topicConfigurationMessage.split(',').filter((elem) => {
                return elem !== '';
            });
            let encryptedTopicKeysObjectArray = currentTopicConfigurationMessage[version].split('#').slice(TopicConfigurationMessageIndexes_1.TopicConfigurationMessageIndexes.TOPIC_ENCRYPTED_KEYS_INDEX);
            const encryptedTopicKeysObject = {
                a: [],
                b: [],
            };
            const algorithm = yield this.getEncryptionAlgorithmFromConfigurationMessage();
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
    getMessageFromTopic(sequenceNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            // Make sure the topicId variable is set before starting...
            if (!this.topicId) {
                throw new Error('Topic ID not set in constructor. Please provide a topic for the SDK to target.');
            }
            // First, check if topic has messages up to "sequenceNumber"
            const topicInfo = yield this.hederaStub.getTopicInfo(this.topicId);
            if (Number(sequenceNumber) > topicInfo.sequenceNumber.toNumber()) {
                throw new Error('Topic sequence number is less than the one provided.');
            }
            return yield this.hederaStub.getMessageFromTopic(this.topicId, sequenceNumber);
        });
    }
}
exports.EncryptedTopic = EncryptedTopic;
//# sourceMappingURL=index.js.map