import { EncryptedTopicConfiguration } from "./hedera/interfaces/EncryptedTopicConfiguration";
import { CreateEncryptedTopicConfiguration } from "./hedera/interfaces/CreateEncryptedTopicConfiguration";
export declare class EncryptedTopic {
    private readonly encryptedTopicConfiguration;
    private readonly client;
    private crypto;
    private readonly privateKey;
    private topicConfigurationMessageInBase64;
    private topicMemoObject;
    constructor(encryptedTopicConfiguration: EncryptedTopicConfiguration);
    create(createEncryptedTopicConfiguration: CreateEncryptedTopicConfiguration): Promise<string>;
    addParticipant(topicId: string, publicKey: string): Promise<void>;
    submitMessage(topicId: string, message: string): Promise<number>;
    getMessage(topicId: string, sequenceNumber: number): Promise<string>;
    private createTopicConfigurationMessage;
    private createMemoObject;
    private createParticipantsTopic;
    private getEncryptedTopicKeysObjectFromTopicConfigurationMessage;
    private getTopicConfigurationObject;
    private getTopicEncryptionAlgorithmFromTopicConfigurationMessage;
    private getTopicEncryptionSizeFromTopicConfigurationMessage;
    private getMemo;
    private getEncryptionKeyAndInitVector;
    private setConfigurationMessageInBase64;
    private initializeCrypto;
    private getSubmitKey;
    private getFileContentsInBase64;
    private getMessageFromTopicInBase64;
}
