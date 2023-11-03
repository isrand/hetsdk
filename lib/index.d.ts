import { TopicParticipant } from "./hedera/interfaces/TopicParticipant";
import { HederaConfiguration } from "./hedera/interfaces/HederaConfiguration";
import { CreateEncryptedTopicConfiguration } from "./hedera/interfaces/CreateEncryptedTopicConfiguration";
export declare class EncryptedTopic {
    private readonly hederaConfiguration;
    private readonly client;
    private crypto;
    private topicConfigurationMessageInBase64;
    private topicMemoObject;
    constructor(hederaConfiguration: HederaConfiguration);
    create(createEncryptedTopicConfiguration: CreateEncryptedTopicConfiguration): Promise<string>;
    submitMessage(topicId: string, message: string, privateKey: string): Promise<number>;
    getMessage(topicId: string, sequenceNumber: number, privateKey: string): Promise<string>;
    getTopicParticipants(topicId: string, privateKey: string): Promise<Array<TopicParticipant>>;
    private createMemoObject;
    private getConfiguration;
    private getMemo;
    private getEncryptionKeyAndInitVector;
    private setConfigurationMessageInBase64;
    private initializeCrypto;
    private getSubmitKey;
    private getFileContentsInBase64;
    private getMessageFromTopicInBase64;
}
