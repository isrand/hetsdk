import { TopicParticipant } from "./hedera/interfaces/TopicParticipant";
import { HederaConfiguration } from "./hedera/interfaces/HederaConfiguration";
import { TopicConfigurationObject } from "./hedera/interfaces/TopicConfigurationObject";
import { CreateEncryptedTopicConfiguration } from "./hedera/interfaces/CreateEncryptedTopicConfiguration";
export declare class EncryptedTopic {
    private readonly hederaConfiguration;
    private readonly client;
    private crypto;
    private topicConfigurationMessageInBase64;
    constructor(hederaConfiguration: HederaConfiguration);
    create(createEncryptedTopicConfiguration: CreateEncryptedTopicConfiguration): Promise<string>;
    submitMessage(topicId: string, message: string, privateKey: string): Promise<number>;
    getMessage(topicId: string, sequenceNumber: number, privateKey: string): Promise<string>;
    getTopicParticipants(topicId: string, privateKey: string): Promise<Array<TopicParticipant>>;
    getConfiguration(topicId: string, privateKey: string): Promise<TopicConfigurationObject>;
    private getTopicEncryptionKeyAndInitVector;
    private setTopicConfigurationMessageInBase64;
    private initializeCryptoWithTopicConfiguration;
    private getTopicSubmitKey;
    private getTopicMessageInBase64;
}
