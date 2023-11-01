import {
    Client, FileContentsQuery, FileCreateTransaction, FileUpdateTransaction,
    PrivateKey,
    TopicCreateTransaction,
    TopicInfo,
    TopicInfoQuery,
    TopicMessage,
    TopicMessageQuery,
    TopicMessageSubmitTransaction
} from "@hashgraph/sdk";
import {Crypto} from "./crypto/Crypto";
import {TopicParticipant} from "./hedera/interfaces/TopicParticipant";
import {HederaConfiguration} from "./hedera/interfaces/HederaConfiguration";
import * as crypto from 'crypto';
import {TopicEncryptionConfiguration} from "./hedera/interfaces/TopicEncryptionConfiguration";
import {TopicConfigurationObject} from "./hedera/interfaces/TopicConfigurationObject";
import {Long} from "@hashgraph/sdk/lib/long";
import {TopicEncryptionKeyAndInitVector} from "./hedera/interfaces/TopicEncryptionKeyAndInitVector";
import {TopicEncryptedMessage} from "./hedera/interfaces/TopicEncryptedMessage";
import {TopicConfigurationMessage} from "./hedera/interfaces/TopicConfigurationMessage";
import {CreateEncryptedTopicConfiguration} from "./hedera/interfaces/CreateEncryptedTopicConfiguration";
import {TopicMemoObject} from "./hedera/interfaces/TopicMemoObject";
import {TopicStorageOptions} from "./hedera/interfaces/TopicStorageOptions";
import {StorageOption} from "./hedera/enums/StorageOption";

export class EncryptedTopic {
    private readonly client: Client;
    private crypto!: Crypto;

    // Hold a copy of the topic configuration message in base64 for further use,
    // so we don't have to get it from the Hedera network every single time.
    private topicConfigurationMessageInBase64!: string;

    // Hold a copy of the topic memo object for further use,
    // so we don't have to get it from the Hedera network every single time.
    private topicMemoObject!: TopicMemoObject;

    public constructor(private readonly hederaConfiguration: HederaConfiguration) {
        this.client = Client.forTestnet().setOperator(
            hederaConfiguration.hederaAccountId,
            PrivateKey.fromString(hederaConfiguration.hederaPrivateKey)
        );
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

        // Remove doubles from participants array
        const uniqueParticipantsArray = createEncryptedTopicConfiguration.participants.filter((obj, index, self) =>
            index === self.findIndex(o => (o.hederaPublicKey === obj.hederaPublicKey || o.publicKey === obj.publicKey))
        );

        const topicConfigurationObject: TopicConfigurationObject = {
            s: submitKey,
            m: createEncryptedTopicConfiguration.metadata
        };

        if (createEncryptedTopicConfiguration.storageOptions.storeParticipantsArray) {
            topicConfigurationObject.p = uniqueParticipantsArray
        }

        const encryptedTopicConfigurationObjectInBase64 = this.crypto.symmetricEncrypt(JSON.stringify(topicConfigurationObject), topicEncryptionKey, topicEncryptionInitVector);

        const topicEncryptionConfiguration: TopicEncryptionConfiguration = {
            a: algorithm,
            s: size,
            e: this.crypto.getEncryptedTopicKeysObject(topicEncryptionKey, topicEncryptionInitVector, uniqueParticipantsArray)
        };

        const topicEncryptionConfigurationInBase64 = Buffer.from(JSON.stringify(topicEncryptionConfiguration)).toString('base64');

        const topicConfigurationMessage = {
            a: encryptedTopicConfigurationObjectInBase64,
            b: topicEncryptionConfigurationInBase64
        };

        const topicConfigurationMessageInBase64: string = Buffer.from(JSON.stringify(topicConfigurationMessage)).toString('base64');

        try {
            // Use the File Service to store the topic configuration message
            if (createEncryptedTopicConfiguration.storageOptions.configuration === StorageOption.File) {
                // Create the file containing the topic configuration message
                const fileCreateTransaction: FileCreateTransaction = new FileCreateTransaction({
                    keys: [PrivateKey.fromStringED25519(this.hederaConfiguration.hederaPrivateKey).publicKey]
                });
                await fileCreateTransaction.freezeWith(this.client);
                await fileCreateTransaction.sign(PrivateKey.fromString(this.hederaConfiguration.hederaPrivateKey));

                const fileCreateTransactionResponse = await fileCreateTransaction.execute(this.client);
                const fileCreateTransactionReceipt = await fileCreateTransactionResponse.getReceipt(this.client);

                if (!fileCreateTransactionReceipt.fileId) {
                    throw new Error('Error while fetching file id from file creation transaction receipt');
                }

                const fileId: string = fileCreateTransactionReceipt.fileId.toString();

                const fileUpdateTransaction: FileUpdateTransaction = new FileUpdateTransaction({
                    fileId: fileId,
                    contents: topicConfigurationMessageInBase64,
                    keys: [PrivateKey.fromStringED25519(this.hederaConfiguration.hederaPrivateKey).publicKey]
                });
                await fileUpdateTransaction.freezeWith(this.client);
                await fileUpdateTransaction.sign(PrivateKey.fromString(this.hederaConfiguration.hederaPrivateKey));

                await fileUpdateTransaction.execute(this.client);

                // Create topic
                const topicCreateTransaction: TopicCreateTransaction = new TopicCreateTransaction({
                    adminKey: PrivateKey.fromString(this.hederaConfiguration.hederaPrivateKey),
                    autoRenewAccountId: this.hederaConfiguration.hederaAccountId
                });

                topicCreateTransaction.setSubmitKey(PrivateKey.fromString(submitKey));

                const topicMemoObject = this.createTopicMemoObject(createEncryptedTopicConfiguration.storageOptions, fileId);

                // Set the topic memo to point at the file containing the topic configuration message
                topicCreateTransaction.setTopicMemo(JSON.stringify(topicMemoObject));

                await topicCreateTransaction.freezeWith(this.client);
                await topicCreateTransaction.sign(PrivateKey.fromString(this.hederaConfiguration.hederaPrivateKey));

                const encryptedTopicCreationResponse = await topicCreateTransaction.execute(this.client);
                const encryptedTopicCreationReceipt = await encryptedTopicCreationResponse.getReceipt(this.client);

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
            const topicCreateTransaction: TopicCreateTransaction = new TopicCreateTransaction({
                adminKey: PrivateKey.fromString(this.hederaConfiguration.hederaPrivateKey),
                autoRenewAccountId: this.hederaConfiguration.hederaAccountId
            });

            topicCreateTransaction.setSubmitKey(PrivateKey.fromString(submitKey));

            const topicMemoObject = this.createTopicMemoObject(createEncryptedTopicConfiguration.storageOptions);

            topicCreateTransaction.setTopicMemo(JSON.stringify(topicMemoObject));

            await topicCreateTransaction.freezeWith(this.client);
            await topicCreateTransaction.sign(PrivateKey.fromString(this.hederaConfiguration.hederaPrivateKey));

            const encryptedTopicCreationResponse = await topicCreateTransaction.execute(this.client);
            const encryptedTopicCreationReceipt = await encryptedTopicCreationResponse.getReceipt(this.client);

            if (!encryptedTopicCreationReceipt.topicId) {
                throw new Error('Topic Id not found in encrypted topic creation transaction receipt.');
            }

            const topicId = encryptedTopicCreationReceipt.topicId.toString() || '';

            // Submit topic configuration message to topic
            const topicSubmitMessageTransaction: TopicMessageSubmitTransaction = new TopicMessageSubmitTransaction({
                topicId: topicId,
                message: Buffer.from(JSON.stringify(topicConfigurationMessage)).toString('base64'),
            });

            await topicSubmitMessageTransaction.freezeWith(this.client);
            await topicSubmitMessageTransaction.sign(PrivateKey.fromString(submitKey));
            await topicSubmitMessageTransaction.sign(PrivateKey.fromString(this.hederaConfiguration.hederaPrivateKey));

            await topicSubmitMessageTransaction.execute(this.client);

            // Cache the topic memo object for future use
            this.topicMemoObject = topicMemoObject;

            // Cache the topic configuration message in base64 for future use
            this.topicConfigurationMessageInBase64 = Buffer.from(JSON.stringify(topicConfigurationMessage)).toString('base64');

            return topicId;
        } catch (error: unknown) {
            console.error(error);

            throw error;
        }
    }

    // "submitMessage" submits a message on an encrypted topic (if the user has access)
    // and returns the sequence number of the message
    public async submitMessage(topicId: string, message: string, privateKey: string): Promise<number> {
        const topicMemoObject: TopicMemoObject = await this.getTopicMemo(topicId);
        const topicEncryptionKeyAndInitVector = await this.getTopicEncryptionKeyAndInitVector(topicId, privateKey);

        const messageEncryptionKey: Buffer = Buffer.from(crypto.randomBytes(32));
        const messageEncryptionInitVector: Buffer = Buffer.from(crypto.randomBytes(16));

        const encryptedMessage = this.crypto.symmetricEncrypt(message, messageEncryptionKey, messageEncryptionInitVector);

        const finalMessage = {
            m: encryptedMessage,
            k: this.crypto.symmetricEncrypt(Buffer.from(messageEncryptionKey).toString('base64'), Buffer.from(topicEncryptionKeyAndInitVector.encryptionKey, 'base64'), Buffer.from(topicEncryptionKeyAndInitVector.initVector, 'base64')),
            i: this.crypto.symmetricEncrypt(Buffer.from(messageEncryptionInitVector).toString('base64'), Buffer.from(topicEncryptionKeyAndInitVector.encryptionKey, 'base64'), Buffer.from(topicEncryptionKeyAndInitVector.initVector, 'base64'))
        };

        const finalMessageInBase64 = Buffer.from(JSON.stringify(finalMessage)).toString('base64');
        const submitKey = await this.getTopicSubmitKey(topicId, privateKey);

        // Topic memo specifies that topic messages should be stored using the File Service
        if (topicMemoObject.s.m.u) {
            const fileCreateTransaction: FileCreateTransaction = new FileCreateTransaction({
                keys: [PrivateKey.fromStringED25519(this.hederaConfiguration.hederaPrivateKey).publicKey]
            });
            await fileCreateTransaction.freezeWith(this.client);
            await fileCreateTransaction.sign(PrivateKey.fromString(this.hederaConfiguration.hederaPrivateKey));

            const fileCreateTransactionResponse = await fileCreateTransaction.execute(this.client);
            const fileCreateTransactionReceipt = await fileCreateTransactionResponse.getReceipt(this.client);

            if (!fileCreateTransactionReceipt.fileId) {
                throw new Error('Error while fetching file id from file creation transaction receipt');
            }

            const fileId: string = fileCreateTransactionReceipt.fileId.toString();

            const fileUpdateTransaction: FileUpdateTransaction = new FileUpdateTransaction({
                fileId: fileId,
                contents: finalMessageInBase64,
                keys: [PrivateKey.fromStringED25519(this.hederaConfiguration.hederaPrivateKey).publicKey]
            });
            await fileUpdateTransaction.freezeWith(this.client);
            await fileUpdateTransaction.sign(PrivateKey.fromString(this.hederaConfiguration.hederaPrivateKey));

            await fileUpdateTransaction.execute(this.client);

            const transaction: TopicMessageSubmitTransaction = await new TopicMessageSubmitTransaction({
                topicId: topicId,
                message: Buffer.from(fileId).toString('base64')
            });

            await transaction.freezeWith(this.client);
            await transaction.sign(PrivateKey.fromString(this.hederaConfiguration.hederaPrivateKey));
            await transaction.sign(PrivateKey.fromString(submitKey));

            const result = await transaction.execute(this.client);
            const receipt = await result.getReceipt(this.client);

            return receipt.topicSequenceNumber.toNumber();
        }

        const transaction: TopicMessageSubmitTransaction = await new TopicMessageSubmitTransaction({
            topicId: topicId,
            message: finalMessageInBase64
        });

        await transaction.freezeWith(this.client);
        await transaction.sign(PrivateKey.fromString(this.hederaConfiguration.hederaPrivateKey));
        await transaction.sign(PrivateKey.fromString(submitKey));

        const result = await transaction.execute(this.client);
        const receipt = await result.getReceipt(this.client);

        return receipt.topicSequenceNumber.toNumber();
    }

    // "getMessage" gets a message from an encrypted topic (if the user has access)
    public async getMessage(topicId: string, sequenceNumber: number, privateKey: string): Promise<string> {
        const topicMemoObject: TopicMemoObject = await this.getTopicMemo(topicId);
        const topicEncryptionKeyAndInitVector = await this.getTopicEncryptionKeyAndInitVector(topicId, privateKey);

        // Topic memo specifies that topic messages should be stored using the File Service
        if (topicMemoObject.s.m.u) {
            const messageFileIdInBase64 = await this.getMessageFromTopicInBase64(topicId, sequenceNumber);
            let fileId = Buffer.from(messageFileIdInBase64, 'base64').toString('utf8');
            const encryptedMessageInBase64: string = await this.getFileContentsInBase64(Buffer.from(fileId, 'base64').toString('utf8'));

            const encryptedMessage: TopicEncryptedMessage = JSON.parse(Buffer.from(encryptedMessageInBase64, 'base64').toString('utf8'));
            const decryptedMessageEncryptionKey = Buffer.from(this.crypto.symmetricDecrypt(encryptedMessage.k, Buffer.from(topicEncryptionKeyAndInitVector.encryptionKey, 'base64'),  Buffer.from(topicEncryptionKeyAndInitVector.initVector, 'base64')), 'base64');
            const decryptedMessageInitVector = Buffer.from(this.crypto.symmetricDecrypt(encryptedMessage.i, Buffer.from(topicEncryptionKeyAndInitVector.encryptionKey, 'base64'),  Buffer.from(topicEncryptionKeyAndInitVector.initVector, 'base64')), 'base64');

            return this.crypto.symmetricDecrypt(encryptedMessage.m, decryptedMessageEncryptionKey, decryptedMessageInitVector);
        }

        let encryptedMessageInBase64 = await this.getMessageFromTopicInBase64(topicId, sequenceNumber);
        encryptedMessageInBase64 = Buffer.from(encryptedMessageInBase64, 'base64').toString('utf8');

        const encryptedMessage: TopicEncryptedMessage = JSON.parse(Buffer.from(encryptedMessageInBase64, 'base64').toString('utf8'));
        const decryptedMessageEncryptionKey = Buffer.from(this.crypto.symmetricDecrypt(encryptedMessage.k, Buffer.from(topicEncryptionKeyAndInitVector.encryptionKey, 'base64'),  Buffer.from(topicEncryptionKeyAndInitVector.initVector, 'base64')), 'base64');
        const decryptedMessageInitVector = Buffer.from(this.crypto.symmetricDecrypt(encryptedMessage.i, Buffer.from(topicEncryptionKeyAndInitVector.encryptionKey, 'base64'),  Buffer.from(topicEncryptionKeyAndInitVector.initVector, 'base64')), 'base64');

        return this.crypto.symmetricDecrypt(encryptedMessage.m, decryptedMessageEncryptionKey, decryptedMessageInitVector);
    }

    // "getTopicParticipants" returns the participants of a topic (if the user has access, and if the user that created the topic chose to
    // store said list in the topic configuration)
    public async getTopicParticipants(topicId: string, privateKey: string): Promise<Array<TopicParticipant>> {
        const topicConfigurationObject: TopicConfigurationObject = await this.getConfiguration(topicId, privateKey);
        if (topicConfigurationObject.p) {
            return topicConfigurationObject.p;
        }

        throw new Error('Topic configuration object did not store participants on creation.');
    }

    // "getConfiguration" returns a topic's configuration object (if the user has access)
    private async getConfiguration(topicId: string, privateKey: string): Promise<TopicConfigurationObject> {
        if (!this.topicConfigurationMessageInBase64) {
            await this.setTopicConfigurationMessageInBase64(topicId);
        }

        if (!this.crypto) {
            await this.initializeCryptoWithTopicConfiguration(this.topicConfigurationMessageInBase64);
        }

        return this.crypto.decryptTopicConfigurationMessage(this.topicConfigurationMessageInBase64, privateKey);
    }

    private async getTopicMemo(topicId: string): Promise<TopicMemoObject> {
        if (!this.topicMemoObject) {
            const topicInfo = new TopicInfoQuery({
                topicId: topicId
            });

            const topicInfoResponse: TopicInfo = await topicInfo.execute(this.client);

            this.topicMemoObject = JSON.parse(topicInfoResponse.topicMemo) as TopicMemoObject;
        }

        return this.topicMemoObject;
    }

    private createTopicMemoObject(topicStorageOptions: TopicStorageOptions, topicConfigurationFileId?: string): TopicMemoObject {
        return {
            s: {
                c: {
                    i: topicConfigurationFileId,
                    u: topicStorageOptions.configuration === StorageOption.File,
                },
                m: {
                    u: topicStorageOptions.messages === StorageOption.File
                }
            }
        }
    }

    private async getTopicEncryptionKeyAndInitVector(topicId: string, privateKey: string): Promise<TopicEncryptionKeyAndInitVector> {
        if (!this.topicConfigurationMessageInBase64) {
            await this.setTopicConfigurationMessageInBase64(topicId);
        }

        if (!this.crypto) {
            await this.initializeCryptoWithTopicConfiguration(this.topicConfigurationMessageInBase64);
        }

        return this.crypto.getTopicEncryptionKeyAndInitVector(this.topicConfigurationMessageInBase64, privateKey);
    }

    private async setTopicConfigurationMessageInBase64(topicId: string): Promise<void> {
        const topicMemoObject: TopicMemoObject = await this.getTopicMemo(topicId);
        let topicConfigurationMessageInBase64: string;

        // Topic memo specifies that topic configuration message is stored using the File Service
        if (topicMemoObject.s.c.u) {
            if (!topicMemoObject.s.c.i) {
                throw new Error('Topic memo object does not specify file Id');
            }

            topicConfigurationMessageInBase64 = await this.getFileContentsInBase64(topicMemoObject.s.c.i);
        // Topic memo specifies that topic configuration message is stored using the Consensus Service
        } else {
            topicConfigurationMessageInBase64 = await this.getMessageFromTopicInBase64(topicId, 1);
            topicConfigurationMessageInBase64 = Buffer.from(topicConfigurationMessageInBase64, 'base64').toString('utf8');
        }

        topicConfigurationMessageInBase64 = Buffer.from(topicConfigurationMessageInBase64, 'base64').toString('utf8');

        this.topicConfigurationMessageInBase64 = Buffer.from(topicConfigurationMessageInBase64).toString('base64');
    }

    private async initializeCryptoWithTopicConfiguration(topicConfigurationMessageInBase64: string): Promise<void> {
        const topicConfigurationMessage: TopicConfigurationMessage = JSON.parse(Buffer.from(topicConfigurationMessageInBase64, 'base64').toString('utf8'));
        const topicEncryptionConfiguration: TopicEncryptionConfiguration = JSON.parse(Buffer.from(topicConfigurationMessage.b, 'base64').toString('utf8'));

        this.crypto = new Crypto(topicEncryptionConfiguration.a, topicEncryptionConfiguration.s);
    }

    private async getTopicSubmitKey(topicId: string, privateKey: string): Promise<string> {
        const topicConfigurationObject = await this.getConfiguration(topicId, privateKey);

        return topicConfigurationObject.s;
    }

    public async getFileContentsInBase64(fileId: string): Promise<string> {
        const fileGetContentsQuery: FileContentsQuery = new FileContentsQuery({
            fileId: fileId
        });

        const fileContentsUint8Array: Uint8Array = await fileGetContentsQuery.execute(this.client);
        let fileContentsString: string = fileContentsUint8Array.toString();

        return fileContentsString;
    }

    private async getMessageFromTopicInBase64(topicId: string, sequenceNumber: number): Promise<string> {
        // First, check if topic has messages up to "sequenceNumber"
        const topicInfo = new TopicInfoQuery({
            topicId: topicId
        });

        const topicInfoResponse: TopicInfo = await topicInfo.execute(this.client);

        if (Number(sequenceNumber) > (topicInfoResponse.sequenceNumber as Long).toNumber()) {
            throw new Error('Topic sequence number is less than the one provided.');
        }

        const topicMessageQuery = new TopicMessageQuery({
            topicId: topicId
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
