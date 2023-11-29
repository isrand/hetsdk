import {
    Client, FileAppendTransaction, FileContentsQuery, FileCreateTransaction, FileUpdateTransaction,
    PrivateKey,
    TopicCreateTransaction,
    TopicInfo,
    TopicInfoQuery,
    TopicMessage,
    TopicMessageQuery,
    TopicMessageSubmitTransaction
} from "@hashgraph/sdk";
import {Crypto} from "./crypto/Crypto";
import {EncryptedTopicConfiguration} from "./hedera/interfaces/EncryptedTopicConfiguration";
import * as crypto from 'crypto';
import {TopicEncryptionData} from "./hedera/interfaces/TopicEncryptionData";
import {TopicData} from "./hedera/interfaces/TopicData";
import {Long} from "@hashgraph/sdk/lib/long";
import {TopicEncryptionKeyAndInitVector} from "./hedera/interfaces/TopicEncryptionKeyAndInitVector";
import {TopicEncryptedMessage} from "./hedera/interfaces/TopicEncryptedMessage";
import {TopicConfigurationObject} from "./hedera/interfaces/TopicConfigurationObject";
import {CreateEncryptedTopicConfiguration} from "./hedera/interfaces/CreateEncryptedTopicConfiguration";
import {TopicMemoObject} from "./hedera/interfaces/TopicMemoObject";
import {TopicStorageOptions} from "./hedera/interfaces/TopicStorageOptions";
import {StorageOptions} from "./hedera/enums/StorageOptions";
import {EncryptedTopicKeysObject} from "./crypto/interfaces/EncryptedTopicKeysObject";

export class EncryptedTopic {
    private readonly client: Client;
    private crypto!: Crypto;

    private readonly TOPIC_DATA_INDEX = 0;
    private readonly TOPIC_ENCRYPTION_ALGORITHM_INDEX = 1;
    private readonly TOPIC_ENCRYPTION_SIZE_INDEX = 2;
    private readonly TOPIC_ENCRYPTED_KEYS_INDEX = 3;

    private readonly privateKey: string;

    // Hold a copy of the topic configuration message in base64 for further use,
    // so we don't have to get it from the Hedera network every single time.
    private topicConfigurationMessage!: string;

    // Hold a copy of the topic memo object for further use,
    // so we don't have to get it from the Hedera network every single time.
    private topicMemoObject!: TopicMemoObject;

    // Set the topicId variable either on constructor (targeting already existing topic)
    // or upon topic creation for simplicity purposes
    private topicId?: string;

    /*

    --- SDK PUBLIC METHODS ---

    */

    public constructor(private readonly encryptedTopicConfiguration: EncryptedTopicConfiguration) {
        this.client = Client.forTestnet().setOperator(
            encryptedTopicConfiguration.hederaAccountId,
            PrivateKey.fromString(encryptedTopicConfiguration.hederaPrivateKey)
        );

        this.privateKey = encryptedTopicConfiguration.privateKey;
        this.topicId = encryptedTopicConfiguration.topicId;
    }

    // "create" creates a new encrypted topic in the Hedera network
    public async create(createEncryptedTopicConfiguration: CreateEncryptedTopicConfiguration): Promise<string> {
        const algorithm = createEncryptedTopicConfiguration.algorithm.split('-')[0];
        const size = parseInt(createEncryptedTopicConfiguration.algorithm.split('-')[1]);
        this.crypto = new Crypto(algorithm, size);

        this.crypto.validateParticipantKeys(createEncryptedTopicConfiguration.participants, size);

        const submitKey: string = PrivateKey.generateED25519().toStringRaw();
        const topicEncryptionKey: Buffer = Buffer.from(crypto.randomBytes(32));
        const topicEncryptionInitVector: Buffer = Buffer.from(crypto.randomBytes(16));

        let topicConfigurationMessage = '';

        // Remove doubles from participants array
        const uniqueParticipantsArray = Array.from(new Set(createEncryptedTopicConfiguration.participants));
        const topicData: TopicData = {
            s: submitKey,
            m: createEncryptedTopicConfiguration.metadata
        };

        const encryptedTopicDataInBase64 = this.crypto.symmetricEncrypt(JSON.stringify(topicData), topicEncryptionKey, topicEncryptionInitVector);

        topicConfigurationMessage += `${encryptedTopicDataInBase64}#${algorithm}#${size}#`;

        const encryptedTopicKeysObject = this.crypto.getEncryptedTopicKeysObject(topicEncryptionKey, topicEncryptionInitVector, uniqueParticipantsArray)

        for (let i = 0; i < createEncryptedTopicConfiguration.participants.length; i++) {
            let participantString = `${encryptedTopicKeysObject.a[i]}_${encryptedTopicKeysObject.b[i]}`;

            if (encryptedTopicKeysObject.c) {
                participantString += `_${encryptedTopicKeysObject.c[i]}`;
            }

            topicConfigurationMessage += `${participantString}#`;
        }

        const topicConfigurationMessageInBase64: string = Buffer.from(topicConfigurationMessage).toString('base64');

        try {
            // Use the File Service to store the topic configuration message
            if (createEncryptedTopicConfiguration.storageOptions.configuration === StorageOptions.File) {
                // Create the file containing the topic configuration message
                const fileCreateTransaction: FileCreateTransaction = new FileCreateTransaction({
                    keys: [PrivateKey.fromString(this.encryptedTopicConfiguration.hederaPrivateKey).publicKey]
                });

                await fileCreateTransaction.freezeWith(this.client);
                await fileCreateTransaction.sign(PrivateKey.fromString(this.encryptedTopicConfiguration.hederaPrivateKey));

                const fileCreateTransactionResponse = await fileCreateTransaction.execute(this.client);
                const fileCreateTransactionReceipt = await fileCreateTransactionResponse.getReceipt(this.client);

                if (!fileCreateTransactionReceipt.fileId) {
                    throw new Error('Error while fetching file id from file creation transaction receipt');
                }

                const fileId: string = fileCreateTransactionReceipt.fileId.toString();

                const fileUpdateTransaction: FileUpdateTransaction = new FileUpdateTransaction({
                    fileId: fileId,
                    contents: topicConfigurationMessageInBase64,
                    keys: [PrivateKey.fromString(this.encryptedTopicConfiguration.hederaPrivateKey).publicKey]
                });

                await fileUpdateTransaction.freezeWith(this.client);
                await fileUpdateTransaction.sign(PrivateKey.fromString(this.encryptedTopicConfiguration.hederaPrivateKey));

                await fileUpdateTransaction.execute(this.client);

                // Create topic
                const topicCreateTransaction: TopicCreateTransaction = new TopicCreateTransaction({
                    adminKey: PrivateKey.fromString(this.encryptedTopicConfiguration.hederaPrivateKey),
                    autoRenewAccountId: this.encryptedTopicConfiguration.hederaAccountId
                });

                topicCreateTransaction.setSubmitKey(PrivateKey.fromString(submitKey));

                // Store the participants in a separate topic if specified by the createEncryptedTopicConfiguration object
                const participantsStorageTopicId: string | undefined = await this.createParticipantsTopic(createEncryptedTopicConfiguration, submitKey);

                const topicMemoObject = this.createMemoObject(createEncryptedTopicConfiguration.storageOptions, fileId, participantsStorageTopicId);

                // Set the topic memo to point at the file containing the topic configuration message
                topicCreateTransaction.setTopicMemo(JSON.stringify(topicMemoObject));

                await topicCreateTransaction.freezeWith(this.client);
                await topicCreateTransaction.sign(PrivateKey.fromString(this.encryptedTopicConfiguration.hederaPrivateKey));

                const encryptedTopicCreationResponse = await topicCreateTransaction.execute(this.client);
                const encryptedTopicCreationReceipt = await encryptedTopicCreationResponse.getReceipt(this.client);

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
            const topicCreateTransaction: TopicCreateTransaction = new TopicCreateTransaction({
                adminKey: PrivateKey.fromString(this.encryptedTopicConfiguration.hederaPrivateKey),
                autoRenewAccountId: this.encryptedTopicConfiguration.hederaAccountId
            });

            topicCreateTransaction.setSubmitKey(PrivateKey.fromString(submitKey));

            // Store the participants in a separate topic if specified by the createEncryptedTopicConfiguration object
            const participantsStorageTopicId: string | undefined = await this.createParticipantsTopic(createEncryptedTopicConfiguration, submitKey);

            const topicMemoObject = this.createMemoObject(createEncryptedTopicConfiguration.storageOptions, undefined, participantsStorageTopicId);

            topicCreateTransaction.setTopicMemo(JSON.stringify(topicMemoObject));

            await topicCreateTransaction.freezeWith(this.client);
            await topicCreateTransaction.sign(PrivateKey.fromString(this.encryptedTopicConfiguration.hederaPrivateKey));

            const encryptedTopicCreationResponse = await topicCreateTransaction.execute(this.client);
            const encryptedTopicCreationReceipt = await encryptedTopicCreationResponse.getReceipt(this.client);

            if (!encryptedTopicCreationReceipt.topicId) {
                throw new Error('Topic Id not found in encrypted topic creation transaction receipt.');
            }

            const topicId = encryptedTopicCreationReceipt.topicId.toString() || '';

            // Submit topic configuration message to topic
            const topicSubmitMessageTransaction: TopicMessageSubmitTransaction = new TopicMessageSubmitTransaction({
                topicId: topicId,
                message: topicConfigurationMessageInBase64
            });

            await topicSubmitMessageTransaction.freezeWith(this.client);
            await topicSubmitMessageTransaction.sign(PrivateKey.fromString(submitKey));
            await topicSubmitMessageTransaction.sign(PrivateKey.fromString(this.encryptedTopicConfiguration.hederaPrivateKey));

            await topicSubmitMessageTransaction.execute(this.client);

            // Cache the topic memo object for future use
            this.topicMemoObject = topicMemoObject;

            // Cache the topic configuration message in base64 for future use
            this.topicConfigurationMessage = topicConfigurationMessage;

            return topicId;
        } catch (error: unknown) {
            console.error(error);

            throw error;
        }
    }

    // "addParticipant" adds a new participant to the encrypted topic, and stores it in the participants topic if the
    // topic memo specifies it
    public async addParticipant(publicKey: string): Promise<void> {
        // Get topic memo, check if topic configuration message is stored using the File Service
        const topicMemoObject: TopicMemoObject = await this.getMemo();

        // Throw error if topic doesn't allow for new participants (configuration is stored using Consensus Service)
        if (!topicMemoObject.s.c.f) {
            throw new Error('New participants can only be added to topics that use the File Service as storage medium for their configuration. Requested topic uses the Consensus Service.');
        }

        if (!topicMemoObject.s.c.i) {
            throw new Error('Topic memo object does not specify configuration file Id');
        }

        const algorithm = await this.getTopicEncryptionAlgorithmFromTopicConfigurationMessage();
        const size = await this.getTopicEncryptionSizeFromTopicConfigurationMessage();

        this.crypto.validateParticipantKeys([publicKey], size);

        // Get topic encryption key and init vector
        const topicEncryptionKeyAndInitVector = await this.getEncryptionKeyAndInitVector();

        // Encrypt topic encryption key and init vector with new participant public keys
        const newEncryptedTopicEncryptionKeyAndInitVectors = this.crypto.getEncryptedTopicKeysObject(
            Buffer.from(topicEncryptionKeyAndInitVector.encryptionKey, 'base64'),
            Buffer.from(topicEncryptionKeyAndInitVector.initVector, 'base64'),
            [publicKey]
        );

        let newEncryptedTopicEncryptionKeyAndInitVectorsString = `${newEncryptedTopicEncryptionKeyAndInitVectors.a[0]}_${newEncryptedTopicEncryptionKeyAndInitVectors.b[0]}`;


        if (algorithm === 'kyber' && newEncryptedTopicEncryptionKeyAndInitVectors.c) {
            newEncryptedTopicEncryptionKeyAndInitVectorsString += `_${newEncryptedTopicEncryptionKeyAndInitVectors.c[0]}#`;
        }

        // Update file
        const fileAppendTransaction: FileAppendTransaction = new FileAppendTransaction({
            fileId: topicMemoObject.s.c.i,
            contents: Buffer.from(newEncryptedTopicEncryptionKeyAndInitVectorsString).toString('base64')
        });

        await fileAppendTransaction.freezeWith(this.client);
        await fileAppendTransaction.sign(PrivateKey.fromString(this.encryptedTopicConfiguration.hederaPrivateKey));

        await fileAppendTransaction.execute(this.client);

        // Store participant in the participants topic
        if (topicMemoObject.s.p.p) {
            const submitKey = await this.getSubmitKey();

            const topicSubmitMessageTransaction: TopicMessageSubmitTransaction = new TopicMessageSubmitTransaction({
                topicId: topicMemoObject.s.p.i,
                message: publicKey,
            });

            await topicSubmitMessageTransaction.freezeWith(this.client);
            await topicSubmitMessageTransaction.sign(PrivateKey.fromString(submitKey));
            await topicSubmitMessageTransaction.sign(PrivateKey.fromString(this.encryptedTopicConfiguration.hederaPrivateKey));

            await topicSubmitMessageTransaction.execute(this.client);
        }

        // Update cached topic configuration message in base 64
        this.topicConfigurationMessage = this.topicConfigurationMessage + newEncryptedTopicEncryptionKeyAndInitVectorsString;

        return;
    }

    // "submitMessage" submits a message on an encrypted topic (if the user has access)
    // and returns the sequence number of the message
    public async submitMessage(message: string): Promise<number> {
        const topicMemoObject: TopicMemoObject = await this.getMemo();
        const topicEncryptionKeyAndInitVector = await this.getEncryptionKeyAndInitVector();

        const messageEncryptionKey: Buffer = Buffer.from(crypto.randomBytes(32));
        const messageEncryptionInitVector: Buffer = Buffer.from(crypto.randomBytes(16));

        const encryptedMessage = this.crypto.symmetricEncrypt(message, messageEncryptionKey, messageEncryptionInitVector);

        const finalMessage = {
            m: encryptedMessage,
            k: this.crypto.symmetricEncrypt(Buffer.from(messageEncryptionKey).toString('base64'), Buffer.from(topicEncryptionKeyAndInitVector.encryptionKey, 'base64'), Buffer.from(topicEncryptionKeyAndInitVector.initVector, 'base64')),
            i: this.crypto.symmetricEncrypt(Buffer.from(messageEncryptionInitVector).toString('base64'), Buffer.from(topicEncryptionKeyAndInitVector.encryptionKey, 'base64'), Buffer.from(topicEncryptionKeyAndInitVector.initVector, 'base64'))
        };

        const finalMessageInBase64 = Buffer.from(JSON.stringify(finalMessage)).toString('base64');
        const submitKey = await this.getSubmitKey();

        // Topic memo specifies that topic messages should be stored using the File Service
        if (topicMemoObject.s.m.f) {
            const fileCreateTransaction: FileCreateTransaction = new FileCreateTransaction({
                keys: [PrivateKey.fromString(this.encryptedTopicConfiguration.hederaPrivateKey).publicKey]
            });
            await fileCreateTransaction.freezeWith(this.client);
            await fileCreateTransaction.sign(PrivateKey.fromString(this.encryptedTopicConfiguration.hederaPrivateKey));

            const fileCreateTransactionResponse = await fileCreateTransaction.execute(this.client);
            const fileCreateTransactionReceipt = await fileCreateTransactionResponse.getReceipt(this.client);

            if (!fileCreateTransactionReceipt.fileId) {
                throw new Error('Error while fetching file id from file creation transaction receipt');
            }

            const fileId: string = fileCreateTransactionReceipt.fileId.toString();

            const fileUpdateTransaction: FileUpdateTransaction = new FileUpdateTransaction({
                fileId: fileId,
                contents: finalMessageInBase64,
                keys: [PrivateKey.fromString(this.encryptedTopicConfiguration.hederaPrivateKey).publicKey]
            });
            await fileUpdateTransaction.freezeWith(this.client);
            await fileUpdateTransaction.sign(PrivateKey.fromString(this.encryptedTopicConfiguration.hederaPrivateKey));

            await fileUpdateTransaction.execute(this.client);

            const transaction: TopicMessageSubmitTransaction = await new TopicMessageSubmitTransaction({
                topicId: this.topicId,
                message: Buffer.from(fileId).toString('base64')
            });

            await transaction.freezeWith(this.client);
            await transaction.sign(PrivateKey.fromString(this.encryptedTopicConfiguration.hederaPrivateKey));
            await transaction.sign(PrivateKey.fromString(submitKey));

            const result = await transaction.execute(this.client);
            const receipt = await result.getReceipt(this.client);

            return receipt.topicSequenceNumber.toNumber();
        }

        const transaction: TopicMessageSubmitTransaction = await new TopicMessageSubmitTransaction({
            topicId: this.topicId,
            message: finalMessageInBase64
        });

        await transaction.freezeWith(this.client);
        await transaction.sign(PrivateKey.fromString(this.encryptedTopicConfiguration.hederaPrivateKey));
        await transaction.sign(PrivateKey.fromString(submitKey));

        const result = await transaction.execute(this.client);
        const receipt = await result.getReceipt(this.client);

        return receipt.topicSequenceNumber.toNumber();
    }

    // "getMessage" gets a message from an encrypted topic (if the user has access)
    public async getMessage(sequenceNumber: number): Promise<string> {
        const topicMemoObject: TopicMemoObject = await this.getMemo();
        const topicEncryptionKeyAndInitVector = await this.getEncryptionKeyAndInitVector();

        // Topic memo specifies that topic messages should be stored using the File Service
        if (topicMemoObject.s.m.f) {
            const messageFileIdInBase64 = await this.getMessageFromTopicInBase64(sequenceNumber);
            let fileId = Buffer.from(messageFileIdInBase64, 'base64').toString('utf8');
            const encryptedMessageInBase64: string = await this.getFileContentsInBase64(Buffer.from(fileId, 'base64').toString('utf8'));

            const encryptedMessage: TopicEncryptedMessage = JSON.parse(Buffer.from(encryptedMessageInBase64, 'base64').toString('utf8'));
            const decryptedMessageEncryptionKey = Buffer.from(this.crypto.symmetricDecrypt(encryptedMessage.k, Buffer.from(topicEncryptionKeyAndInitVector.encryptionKey, 'base64'),  Buffer.from(topicEncryptionKeyAndInitVector.initVector, 'base64')), 'base64');
            const decryptedMessageInitVector = Buffer.from(this.crypto.symmetricDecrypt(encryptedMessage.i, Buffer.from(topicEncryptionKeyAndInitVector.encryptionKey, 'base64'),  Buffer.from(topicEncryptionKeyAndInitVector.initVector, 'base64')), 'base64');

            return this.crypto.symmetricDecrypt(encryptedMessage.m, decryptedMessageEncryptionKey, decryptedMessageInitVector);
        }

        let encryptedMessageInBase64 = await this.getMessageFromTopicInBase64(sequenceNumber);
        encryptedMessageInBase64 = Buffer.from(encryptedMessageInBase64, 'base64').toString('utf8');

        const encryptedMessage: TopicEncryptedMessage = JSON.parse(Buffer.from(encryptedMessageInBase64, 'base64').toString('utf8'));
        const decryptedMessageEncryptionKey = Buffer.from(this.crypto.symmetricDecrypt(encryptedMessage.k, Buffer.from(topicEncryptionKeyAndInitVector.encryptionKey, 'base64'),  Buffer.from(topicEncryptionKeyAndInitVector.initVector, 'base64')), 'base64');
        const decryptedMessageInitVector = Buffer.from(this.crypto.symmetricDecrypt(encryptedMessage.i, Buffer.from(topicEncryptionKeyAndInitVector.encryptionKey, 'base64'),  Buffer.from(topicEncryptionKeyAndInitVector.initVector, 'base64')), 'base64');

        return this.crypto.symmetricDecrypt(encryptedMessage.m, decryptedMessageEncryptionKey, decryptedMessageInitVector);
    }

    /*

    --- SDK INTERNAL METHODS ---

    */

    private createMemoObject(topicStorageOptions: TopicStorageOptions, topicConfigurationFileId?: string, participantsTopicId?: string): TopicMemoObject {
        return {
            s: {
                c: {
                    i: topicConfigurationFileId || undefined,
                    f: topicStorageOptions.configuration === StorageOptions.File,
                },
                m: {
                    f: topicStorageOptions.messages === StorageOptions.File
                },
                p: {
                    p: topicStorageOptions.storeParticipants,
                    i: participantsTopicId || undefined
                }
            }
        }
    }

    private async createParticipantsTopic(createEncryptedTopicConfiguration: CreateEncryptedTopicConfiguration, submitKey: string): Promise<string | undefined> {
        if (!createEncryptedTopicConfiguration.storageOptions.storeParticipants) {
            return undefined;
        }

        const topicCreateTransaction: TopicCreateTransaction = new TopicCreateTransaction({
            adminKey: PrivateKey.fromString(this.encryptedTopicConfiguration.hederaPrivateKey),
            autoRenewAccountId: this.encryptedTopicConfiguration.hederaAccountId
        });

        topicCreateTransaction.setSubmitKey(PrivateKey.fromString(submitKey));

        await topicCreateTransaction.freezeWith(this.client);
        await topicCreateTransaction.sign(PrivateKey.fromString(this.encryptedTopicConfiguration.hederaPrivateKey));

        const participantsTopicCreationResponse = await topicCreateTransaction.execute(this.client);
        const participantsTopicCreationReceipt = await participantsTopicCreationResponse.getReceipt(this.client);

        if (!participantsTopicCreationReceipt.topicId) {
            throw new Error('Topic Id not found in encrypted topic creation transaction receipt.');
        }

        const topicId = participantsTopicCreationReceipt.topicId.toString() || '';

        for (const publicKey of createEncryptedTopicConfiguration.participants) {
            const topicSubmitMessageTransaction: TopicMessageSubmitTransaction = new TopicMessageSubmitTransaction({
                topicId: topicId,
                message: publicKey,
            });

            await topicSubmitMessageTransaction.freezeWith(this.client);
            await topicSubmitMessageTransaction.sign(PrivateKey.fromString(submitKey));
            await topicSubmitMessageTransaction.sign(PrivateKey.fromString(this.encryptedTopicConfiguration.hederaPrivateKey));

            await topicSubmitMessageTransaction.execute(this.client);
        }

        return topicId;
    }

    private async getEncryptedTopicKeysObjectFromTopicConfigurationMessage(): Promise<EncryptedTopicKeysObject> {
        if (!this.topicConfigurationMessage) {
            await this.setConfigurationMessage();
        }

        let encryptedTopicKeysObjectArray = this.topicConfigurationMessage.split('#');
        encryptedTopicKeysObjectArray = encryptedTopicKeysObjectArray.slice(this.TOPIC_ENCRYPTED_KEYS_INDEX);
        const encryptedTopicKeysObject: EncryptedTopicKeysObject = {
            a: [],
            b: [],
        };

        const algorithm = await this.getTopicEncryptionAlgorithmFromTopicConfigurationMessage();

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
    }

    private async getTopicEncryptionAlgorithmFromTopicConfigurationMessage(): Promise<string> {
        if (!this.topicConfigurationMessage) {
            await this.setConfigurationMessage();
        }

        return this.topicConfigurationMessage.split('#')[this.TOPIC_ENCRYPTION_ALGORITHM_INDEX];
    }

    private async getTopicEncryptionSizeFromTopicConfigurationMessage(): Promise<number> {
        if (!this.topicConfigurationMessage) {
            await this.setConfigurationMessage();
        }

        return Number(this.topicConfigurationMessage.split('#')[this.TOPIC_ENCRYPTION_SIZE_INDEX]);
    }

    private async getMemo(): Promise<TopicMemoObject> {
        // Make sure the topicId variable is set before starting...
        if (!this.topicId) {
            throw new Error('Topic ID not set in constructor. Please provide a topic for the SDK to target.');
        }

        if (!this.topicMemoObject) {
            const topicInfo = new TopicInfoQuery({
                topicId: this.topicId
            });

            const topicInfoResponse: TopicInfo = await topicInfo.execute(this.client);

            this.topicMemoObject = JSON.parse(topicInfoResponse.topicMemo) as TopicMemoObject;
        }

        return this.topicMemoObject;
    }

    private async getEncryptionKeyAndInitVector(): Promise<TopicEncryptionKeyAndInitVector> {
        if (!this.topicConfigurationMessage) {
            await this.setConfigurationMessage();
        }

        if (!this.crypto) {
            await this.initializeCrypto();
        }

        const encryptedTopicKeysObject = await this.getEncryptedTopicKeysObjectFromTopicConfigurationMessage();

        return this.crypto.getTopicEncryptionKeyAndInitVector(encryptedTopicKeysObject, this.privateKey);
    }

    private async setConfigurationMessage(): Promise<void> {
        const topicMemoObject: TopicMemoObject = await this.getMemo();
        let topicConfigurationMessage: string;

        // Topic memo specifies that topic configuration message is stored using the File Service
        if (topicMemoObject.s.c.f) {
            if (!topicMemoObject.s.c.i) {
                throw new Error('Topic memo object does not specify file Id');
            }

            topicConfigurationMessage = await this.getFileContentsInBase64(topicMemoObject.s.c.i);
        // Topic memo specifies that topic configuration message is stored using the Consensus Service
        } else {
            topicConfigurationMessage = await this.getMessageFromTopicInBase64(1);
        }

        this.topicConfigurationMessage = Buffer.from(topicConfigurationMessage, 'base64').toString('utf8');
    }

    private async initializeCrypto(): Promise<void> {
        this.crypto = new Crypto(await this.getTopicEncryptionAlgorithmFromTopicConfigurationMessage(), await this.getTopicEncryptionSizeFromTopicConfigurationMessage());
    }

    private async getSubmitKey(): Promise<string> {
        if (!this.topicConfigurationMessage) {
            await this.setConfigurationMessage();
        }

        if (!this.crypto) {
            await this.initializeCrypto();
        }

        const encryptedTopicDataInBase64 = this.topicConfigurationMessage.split('#')[this.TOPIC_DATA_INDEX];
        const encryptedTopicKeysObject = await this.getEncryptedTopicKeysObjectFromTopicConfigurationMessage();
        const topicConfigurationObject = this.crypto.decryptTopicData(encryptedTopicKeysObject, encryptedTopicDataInBase64, this.privateKey);

        return topicConfigurationObject.s;
    }

    private async getFileContentsInBase64(fileId: string): Promise<string> {
        const fileGetContentsQuery: FileContentsQuery = new FileContentsQuery({
            fileId: fileId
        });

        const fileContentsUint8Array: Uint8Array = await fileGetContentsQuery.execute(this.client);
        let fileContentsString: string = fileContentsUint8Array.toString();

        return fileContentsString;
    }

    private async getMessageFromTopicInBase64(sequenceNumber: number): Promise<string> {
        // Make sure the topicId variable is set before starting...
        if (!this.topicId) {
            throw new Error('Topic ID not set in constructor. Please provide a topic for the SDK to target.');
        }

        // First, check if topic has messages up to "sequenceNumber"
        const topicInfo = new TopicInfoQuery({
            topicId: this.topicId
        });

        const topicInfoResponse: TopicInfo = await topicInfo.execute(this.client);

        if (Number(sequenceNumber) > (topicInfoResponse.sequenceNumber as Long).toNumber()) {
            throw new Error('Topic sequence number is less than the one provided.');
        }

        const topicMessageQuery = new TopicMessageQuery({
            topicId: this.topicId
        }).setStartTime(0);

        const message: string = await new Promise((resolve, reject) => {
            topicMessageQuery.subscribe(
                this.client,
                (error: unknown) => {
                    reject(error);
                },
                (topicMessage: TopicMessage) => {
                    // Check if the original message was split among different chunks
                    if (topicMessage.chunks.length > 0) {
                        for (const chunk of topicMessage.chunks) {
                            if ((chunk.sequenceNumber as Long).toNumber() === Number(sequenceNumber)) {
                                resolve(Buffer.from(topicMessage.contents).toString('base64'));
                            }
                        }
                    }

                    // Check if the original message is kept within just one message (no chunks)
                    if ((topicMessage.sequenceNumber as Long).toNumber() === Number(sequenceNumber)) {
                        resolve(Buffer.from(topicMessage.contents).toString('base64'));
                    }
                }
            );
        });

        return message;
    }
}
