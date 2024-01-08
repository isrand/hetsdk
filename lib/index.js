"use strict";
/* eslint-disable id-length */
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
const StorageOptions_1 = require("./hedera/enums/StorageOptions");
const HederaStub_1 = require("./hedera/HederaStub");
const crypto = __importStar(require("crypto"));
const TopicConfigurationMessageIndices_1 = require("./hedera/enums/TopicConfigurationMessageIndices");
const RSA_1 = require("./crypto/adapters/RSA");
const Kyber_1 = require("./crypto/adapters/Kyber");
class EncryptedTopic {
    /*
     *
     *--- SDK PUBLIC METHODS ---
     *
     */
    constructor(encryptedTopicConfiguration, 
    // Allow to pass an IHederaStub-compliant class from outside for test purposes
    stub) {
        this.encryptedTopicConfiguration = encryptedTopicConfiguration;
        this.stub = stub;
        if (stub) {
            this.hederaStub = stub;
        }
        else {
            this.hederaStub = new HederaStub_1.HederaStub(sdk_1.Client.forTestnet().setOperator(encryptedTopicConfiguration.hederaAccountId, sdk_1.PrivateKey.fromString(encryptedTopicConfiguration.hederaPrivateKey)), this.encryptedTopicConfiguration.hederaPrivateKey, this.encryptedTopicConfiguration.hederaAccountId);
        }
        this.privateKey = encryptedTopicConfiguration.privateKey;
        this.topicId = encryptedTopicConfiguration.topicId;
    }
    /*
     * "generateKeyPair" allows the user to create a public / private key pair should they not have one already,
     * with the algorithm and key size of their choosing, without the need to initialize the EncryptedTopic object
     */
    static generateKeyPair(encryptionAlgorithm) {
        const algorithm = encryptionAlgorithm.split('-')[0];
        if (algorithm === 'rsa') {
            return new RSA_1.RSA().generateKeyPair();
        }
        const size = Number(encryptionAlgorithm.split('-')[1]);
        return new Kyber_1.Kyber(size).generateKeyPair();
    }
    // "create" creates a new encrypted topic in the Hedera network
    create(createEncryptedTopicConfiguration) {
        return __awaiter(this, void 0, void 0, function* () {
            const submitKey = sdk_1.PrivateKey.generateED25519().toStringRaw();
            const topicConfigurationMessageObject = this.createTopicConfigurationMessageObject({
                submitKey: submitKey,
                algorithm: createEncryptedTopicConfiguration.algorithm.split('-')[0],
                size: Number(createEncryptedTopicConfiguration.algorithm.split('-')[1]),
                participants: Array.from(new Set(createEncryptedTopicConfiguration.participants)),
                metadata: createEncryptedTopicConfiguration.metadata
            });
            this.topicConfigurationMessage = `${topicConfigurationMessageObject.topicConfigurationMessage}${topicConfigurationMessageObject.participantsEncryptedTopicKeys}`;
            let fileId;
            if (createEncryptedTopicConfiguration.storageOptions.configuration === StorageOptions_1.StorageOptions.File) {
                fileId = yield this.hederaStub.createFile();
                yield this.hederaStub.appendToFile(fileId, this.topicConfigurationMessage);
            }
            let participantsTopicId;
            if (createEncryptedTopicConfiguration.storageOptions.storeParticipants) {
                participantsTopicId = yield this.createParticipantsTopic(submitKey, createEncryptedTopicConfiguration);
            }
            this.topicMemoObject = this.createMemoObject(createEncryptedTopicConfiguration.storageOptions, participantsTopicId, fileId);
            this.topicId = yield this.hederaStub.createTopic(submitKey, this.topicMemoObject);
            if (createEncryptedTopicConfiguration.storageOptions.configuration === StorageOptions_1.StorageOptions.Message) {
                yield this.hederaStub.submitMessageToTopic(submitKey, this.topicId, Buffer.from(this.topicConfigurationMessage).toString('base64'));
            }
            return this.topicId;
        });
    }
    /*
     * "addParticipant" adds a new participant to the encrypted topic, and stores it in the participants topic if the
     * topic memo specifies
     */
    addParticipant(publicKey, forwardSecrecy) {
        return __awaiter(this, void 0, void 0, function* () {
            if (forwardSecrecy) {
                yield this.rotateEncryptionKey();
            }
            yield this.setMemo();
            yield this.setConfigurationMessage();
            const algorithm = yield this.getEncryptionAlgorithmFromConfigurationMessage();
            const size = yield this.getEncryptionSizeFromConfigurationMessage();
            this.initializeCrypto(algorithm, size);
            if (!this.topicMemoObject.s.c.f) {
                throw new Error('New participants can only be added to topics that use the File Service as storage medium for their configuration. Requested topic uses the Consensus Service.');
            }
            const currentConfigurationMessageVersion = yield this.getCurrentTopicConfigurationMessageVersion();
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
            return true;
        });
    }
    /*
     * "submitMessage" submits a message on an encrypted topic (if the user has access)
     * and returns the sequence number of the message
     */
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
                return this.hederaStub.submitMessageToTopic(submitKey, this.topicId, Buffer.from(fileId).toString('base64'));
            }
            return this.hederaStub.submitMessageToTopic(submitKey, this.topicId, finalMessageInBase64);
        });
    }
    // "getMessage" gets a message from an encrypted topic (if the user has access)
    getMessage(sequenceNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.setMemo();
            yield this.setConfigurationMessage();
            const algorithm = yield this.getEncryptionAlgorithmFromConfigurationMessage();
            const size = yield this.getEncryptionSizeFromConfigurationMessage();
            this.initializeCrypto(algorithm, size);
            let encryptedMessageInBase64;
            if (this.topicMemoObject.s.m.f) {
                let messageFileId = yield this.getMessageFromTopic(sequenceNumber);
                while (this.isBase64Encoded(messageFileId)) {
                    messageFileId = Buffer.from(messageFileId, 'base64').toString('utf8');
                }
                encryptedMessageInBase64 = yield this.hederaStub.getFileContents(messageFileId);
            }
            else {
                encryptedMessageInBase64 = yield this.getMessageFromTopic(sequenceNumber);
            }
            while (this.isBase64Encoded(encryptedMessageInBase64)) {
                encryptedMessageInBase64 = Buffer.from(encryptedMessageInBase64, 'base64').toString('utf8');
            }
            const encryptedMessage = JSON.parse(encryptedMessageInBase64);
            const topicEncryptionKeyAndInitVector = yield this.getEncryptionKeyAndInitVector(encryptedMessage.v);
            const decryptedMessageEncryptionKey = Buffer.from(this.crypto.symmetricDecrypt(encryptedMessage.k, Buffer.from(topicEncryptionKeyAndInitVector.encryptionKey, 'base64'), Buffer.from(topicEncryptionKeyAndInitVector.initVector, 'base64')), 'base64');
            const decryptedMessageInitVector = Buffer.from(this.crypto.symmetricDecrypt(encryptedMessage.i, Buffer.from(topicEncryptionKeyAndInitVector.encryptionKey, 'base64'), Buffer.from(topicEncryptionKeyAndInitVector.initVector, 'base64')), 'base64');
            return this.crypto.symmetricDecrypt(encryptedMessage.m, decryptedMessageEncryptionKey, decryptedMessageInitVector);
        });
    }
    /*
     * "getParticipants" returns the list of participants that are part of the topic, if the encrypted
     * topic admin chose to store them upon creation
     */
    getParticipants() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.setMemo();
            if (!this.topicMemoObject.s.p.p) {
                throw new Error('Topic did not choose to store participants upon creation, cannot fetch list of participants.');
            }
            const topicInfo = yield this.hederaStub.getTopicInfo(this.topicMemoObject.s.p.i);
            const sequenceNumber = Number(topicInfo.sequenceNumber);
            const participants = [];
            for (let i = 1; i <= sequenceNumber; i++) {
                const participant = yield this.hederaStub.getMessageFromTopic(i, this.topicMemoObject.s.p.i);
                participants.push(Buffer.from(participant, 'base64').toString('utf8'));
            }
            return Array.from(new Set(participants));
        });
    }
    /*
     * "rotateEncryptionKey" allows the topic administrator to rotate its encryption key and re-encrypt it with
     * every participant's public key, appending the new configuration message to the old one
     */
    rotateEncryptionKey() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.setMemo();
            yield this.setConfigurationMessage();
            if (!this.topicMemoObject.s.c.f) {
                throw new Error('Topic encryption key rotation is only available in encrypted topics that use the File Service as storage medium for their configuration. Requested topic uses the Consensus Service.');
            }
            if (!this.topicMemoObject.s.p.p) {
                throw new Error('Topic did not choose to store participants upon creation, topic encryption key rotation is not possible.');
            }
            const currentVersion = yield this.getCurrentTopicConfigurationMessageVersion();
            const participants = yield this.getParticipants();
            const topicData = yield this.getTopicData(currentVersion);
            const algorithm = yield this.getEncryptionAlgorithmFromConfigurationMessage();
            const size = yield this.getEncryptionSizeFromConfigurationMessage();
            const newTopicConfigurationMessageObject = this.createTopicConfigurationMessageObject({
                submitKey: topicData.s,
                metadata: topicData.m,
                participants: participants,
                size: size,
                algorithm: algorithm
            });
            const newTopicConfigurationMessage = `${newTopicConfigurationMessageObject.topicConfigurationMessage}${newTopicConfigurationMessageObject.participantsEncryptedTopicKeys}`;
            const newTopicConfigurationString = `,${newTopicConfigurationMessage}`;
            yield this.hederaStub.appendToFile(this.topicMemoObject.s.c.i, newTopicConfigurationString);
        });
    }
    /*
     *
     *--- SDK INTERNAL METHODS ---
     *
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
    createTopicConfigurationMessageObject(topicConfigurationMessageParameters) {
        const algorithm = topicConfigurationMessageParameters.algorithm;
        const size = topicConfigurationMessageParameters.size;
        const participants = topicConfigurationMessageParameters.participants;
        const topicData = { s: topicConfigurationMessageParameters.submitKey, m: topicConfigurationMessageParameters.metadata };
        const topicEncryptionKey = Buffer.from(crypto.randomBytes(32));
        const topicEncryptionInitVector = Buffer.from(crypto.randomBytes(16));
        this.initializeCrypto(algorithm, size);
        this.crypto.validateParticipantKeys(participants, size);
        const encryptedTopicDataInBase64 = this.crypto.symmetricEncrypt(JSON.stringify(topicData), topicEncryptionKey, topicEncryptionInitVector);
        let topicConfigurationMessage = `${encryptedTopicDataInBase64}#${algorithm}#${size}#`;
        let participantsEncryptedTopicKeys = '';
        const encryptedTopicKeysObject = this.crypto.getEncryptedTopicKeysObject(topicEncryptionKey, topicEncryptionInitVector, participants);
        for (let i = 0; i < participants.length; i++) {
            let participantString = `${encryptedTopicKeysObject.a[i]}_${encryptedTopicKeysObject.b[i]}`;
            if (encryptedTopicKeysObject.c) {
                participantString += `_${encryptedTopicKeysObject.c[i]}`;
            }
            participantsEncryptedTopicKeys += `${participantString}#`;
        }
        return {
            topicConfigurationMessage: topicConfigurationMessage,
            participantsEncryptedTopicKeys: participantsEncryptedTopicKeys
        };
    }
    createMemoObject(topicStorageOptions, participantsTopicId, topicConfigurationFileId) {
        return {
            s: {
                c: {
                    i: topicConfigurationFileId || '',
                    f: topicStorageOptions.configuration === StorageOptions_1.StorageOptions.File
                },
                m: {
                    f: topicStorageOptions.messages === StorageOptions_1.StorageOptions.File
                },
                p: {
                    p: topicStorageOptions.storeParticipants,
                    i: participantsTopicId || ''
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
            return currentTopicConfigurationMessage[currentTopicConfigurationMessage.length - 1].split('#')[TopicConfigurationMessageIndices_1.TopicConfigurationMessageIndices.TopicEncryptionAlgorithmIndex];
        });
    }
    getEncryptionSizeFromConfigurationMessage() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.setConfigurationMessage();
            const currentTopicConfigurationMessage = this.topicConfigurationMessage.split(',').filter((elem) => {
                return elem !== '';
            });
            return Number(currentTopicConfigurationMessage[currentTopicConfigurationMessage.length - 1].split('#')[TopicConfigurationMessageIndices_1.TopicConfigurationMessageIndices.TopicEncryptionSizeIndex]);
        });
    }
    setMemo() {
        return __awaiter(this, void 0, void 0, function* () {
            const topicInfo = yield this.hederaStub.getTopicInfo(this.topicId);
            this.topicMemoObject = JSON.parse(topicInfo.topicMemo);
        });
    }
    getEncryptionKeyAndInitVector(version) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.setConfigurationMessage();
            const algorithm = yield this.getEncryptionAlgorithmFromConfigurationMessage();
            const size = yield this.getEncryptionSizeFromConfigurationMessage();
            this.initializeCrypto(algorithm, size);
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
                this.topicConfigurationMessage = yield this.hederaStub.getFileContents(this.topicMemoObject.s.c.i);
                // Topic memo specifies that topic configuration message is stored using the Consensus Service
            }
            else {
                topicConfigurationMessage = yield this.getMessageFromTopic(1);
                this.topicConfigurationMessage = Buffer.from(topicConfigurationMessage, 'base64').toString('utf8');
            }
            while (this.isBase64Encoded(this.topicConfigurationMessage)) {
                this.topicConfigurationMessage = Buffer.from(this.topicConfigurationMessage, 'base64').toString('utf8');
            }
        });
    }
    initializeCrypto(algorithm, size) {
        if (algorithm === 'rsa') {
            this.crypto = new RSA_1.RSA();
        }
        else if (algorithm === 'kyber') {
            this.crypto = new Kyber_1.Kyber(size);
        }
    }
    getTopicData(version) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.setConfigurationMessage();
            const algorithm = yield this.getEncryptionAlgorithmFromConfigurationMessage();
            const size = yield this.getEncryptionSizeFromConfigurationMessage();
            this.initializeCrypto(algorithm, size);
            const currentTopicConfigurationMessage = this.topicConfigurationMessage.split(',').filter((elem) => {
                return elem !== '';
            });
            const encryptedTopicDataInBase64 = currentTopicConfigurationMessage[version].split('#')[TopicConfigurationMessageIndices_1.TopicConfigurationMessageIndices.TopicDataIndex];
            const encryptedTopicKeysObject = yield this.getEncryptedTopicKeysObjectFromTopicConfigurationMessage(version);
            return this.crypto.decryptTopicData(encryptedTopicKeysObject, encryptedTopicDataInBase64, this.privateKey);
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
            const encryptedTopicKeysObjectArray = currentTopicConfigurationMessage[version].split('#').slice(TopicConfigurationMessageIndices_1.TopicConfigurationMessageIndices.TopicEncryptedKeysIndex);
            const encryptedTopicKeysObject = {
                a: [],
                b: []
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
            // First, check if topic has messages up to "sequenceNumber"
            const topicInfo = yield this.hederaStub.getTopicInfo(this.topicId);
            if (Number(sequenceNumber) > Number(topicInfo.sequenceNumber)) {
                throw new Error('Topic sequence number is less than the one provided.');
            }
            return this.hederaStub.getMessageFromTopic(sequenceNumber, this.topicId);
        });
    }
    isBase64Encoded(str) {
        try {
            return btoa(atob(str)) === str;
        }
        catch (error) {
            return false;
        }
    }
}
exports.EncryptedTopic = EncryptedTopic;
//# sourceMappingURL=index.js.map