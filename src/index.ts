import {
    Client,
    PrivateKey,
    TopicCreateTransaction, TopicInfo, TopicInfoQuery, TopicMessage, TopicMessageQuery,
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

export class EncryptedTopic {
    private readonly client: Client;
    private crypto!: Crypto;

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

        if (createEncryptedTopicConfiguration.storeParticipantsArray) {
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

        try {
            // Create topic
            const topicCreateTransaction: TopicCreateTransaction = new TopicCreateTransaction({
                adminKey: PrivateKey.fromString(this.hederaConfiguration.hederaPrivateKey),
                autoRenewAccountId: this.hederaConfiguration.hederaAccountId
            });

            topicCreateTransaction.setSubmitKey(PrivateKey.fromString(submitKey));

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

            return topicId;
        } catch (error: unknown) {
            console.error(error);

            throw error;
        }
    }

    // "submitMessage" submits a message on an encrypted topic (if the user has access)
    // and returns the sequence number of the message
    public async submitMessage(topicId: string, message: string, privateKey: string): Promise<number> {
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
        const topicEncryptionKeyAndInitVector = await this.getTopicEncryptionKeyAndInitVector(topicId, privateKey);
        let encryptedMessageInBase64 = await this.getTopicMessageInBase64(topicId, sequenceNumber);
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
    public async getConfiguration(topicId: string, privateKey: string): Promise<TopicConfigurationObject> {
        let topicConfigurationMessageInBase64: string = await this.getTopicMessageInBase64(topicId, 1);
        topicConfigurationMessageInBase64 = Buffer.from(topicConfigurationMessageInBase64, 'base64').toString('utf8');

        if (!this.crypto) {
            const topicConfigurationMessage: TopicConfigurationMessage = JSON.parse(Buffer.from(topicConfigurationMessageInBase64, 'base64').toString('utf8'));
            const topicEncryptionConfiguration: TopicEncryptionConfiguration = JSON.parse(Buffer.from(topicConfigurationMessage.b, 'base64').toString('utf8'));

            this.crypto = new Crypto(topicEncryptionConfiguration.a, topicEncryptionConfiguration.s);
        }

        return this.crypto.decryptTopicConfigurationMessage(topicConfigurationMessageInBase64, privateKey);
    }

    private async getTopicEncryptionKeyAndInitVector(topicId: string, privateKey: string): Promise<TopicEncryptionKeyAndInitVector> {
        let topicConfigurationMessageInBase64: string = await this.getTopicMessageInBase64(topicId, 1);
        topicConfigurationMessageInBase64 = Buffer.from(topicConfigurationMessageInBase64, 'base64').toString('utf8');

        if (!this.crypto) {
            const topicConfigurationMessage: TopicConfigurationMessage = JSON.parse(Buffer.from(topicConfigurationMessageInBase64, 'base64').toString('utf8'));
            const topicEncryptionConfiguration: TopicEncryptionConfiguration = JSON.parse(Buffer.from(topicConfigurationMessage.b, 'base64').toString('utf8'));

            this.crypto = new Crypto(topicEncryptionConfiguration.a, topicEncryptionConfiguration.s);
        }

        return this.crypto.getTopicEncryptionKeyAndInitVector(topicConfigurationMessageInBase64, privateKey);
    }

    private async getTopicSubmitKey(topicId: string, privateKey: string): Promise<string> {
        const topicConfigurationObject = await this.getConfiguration(topicId, privateKey);

        return topicConfigurationObject.s;
    }

    private async getTopicMessageInBase64(topicId: string, sequenceNumber: number): Promise<string> {
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
