import { TopicEncryptionAlgorithms } from "./crypto/Crypto";
import { TopicParticipant } from "./hedera/interfaces/TopicParticipant";
import { HederaConfiguration } from "./hedera/interfaces/HederaConfiguration";
import { TopicConfigurationObject } from "./hedera/interfaces/TopicConfigurationObject";
export declare class EncryptedTopic {
    private readonly hederaConfiguration;
    private readonly client;
    private crypto;
    constructor(hederaConfiguration: HederaConfiguration);
    create(topicParticipants: Array<TopicParticipant>, topicEncryptionAlgorithm: TopicEncryptionAlgorithms, storeParticipants: boolean, topicMetadata?: any): Promise<string>;
    submitMessage(topicId: string, message: string, privateKey: string): Promise<number>;
    getMessage(topicId: string, sequenceNumber: number, privateKey: string): Promise<string>;
    getTopicParticipants(topicId: string, privateKey: string): Promise<Array<TopicParticipant>>;
    getConfiguration(topicId: string, privateKey: string): Promise<TopicConfigurationObject>;
    private getTopicEncryptionKeyAndInitVector;
    private getTopicSubmitKey;
    private getTopicMessageInBase64;
}
