/// <reference types="node" />
import { TopicParticipant } from "../hedera/interfaces/TopicParticipant";
import { EncryptedTopicKeysObject } from "./interfaces/EncryptedTopicKeysObject";
import { TopicEncryptionKeyAndInitVector } from "../hedera/interfaces/TopicEncryptionKeyAndInitVector";
import { TopicConfigurationObject } from "../hedera/interfaces/TopicConfigurationObject";
export declare class Crypto {
    private readonly algorithm;
    private readonly size;
    private adapter;
    constructor(algorithm: string, size: number);
    validateParticipantKeys(topicParticipants: Array<TopicParticipant>, topicEncryptionKeySize: number): void;
    symmetricEncrypt(data: string, symmetricKey: Buffer, initVector: Buffer): string;
    symmetricDecrypt(data: string, symmetricKey: Buffer, initVector: Buffer): string;
    getEncryptedTopicKeysObject(topicEncryptionKey: Buffer, topicEncryptionInitVector: Buffer, topicParticipants: Array<TopicParticipant>): EncryptedTopicKeysObject;
    decryptTopicConfigurationMessage(topicConfigurationMessageInBase64: string, privateKey: string): TopicConfigurationObject;
    getTopicEncryptionKeyAndInitVector(topicConfigurationMessageInBase64: string, privateKey: string): TopicEncryptionKeyAndInitVector;
}
