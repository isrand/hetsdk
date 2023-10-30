/// <reference types="node" />
import { EncryptedTopicKeysObject } from "./EncryptedTopicKeysObject";
import { TopicParticipant } from "../../hedera/interfaces/TopicParticipant";
import { TopicEncryptionKeyAndInitVector } from "../../hedera/interfaces/TopicEncryptionKeyAndInitVector";
import { TopicConfigurationObject } from "../../hedera/interfaces/TopicConfigurationObject";
export interface CryptoAdapter {
    getEncryptedTopicKeysObject(topicEncryptionKey: Buffer, topicEncryptionInitVector: Buffer, topicParticipants: Array<TopicParticipant>): EncryptedTopicKeysObject;
    symmetricEncrypt(data: string, symmetricKey: Buffer, initVector: Buffer): string;
    symmetricDecrypt(data: string, symmetricKey: Buffer, initVector: Buffer): string;
    validateParticipantKeys(topicParticipants: Array<TopicParticipant>, topicEncryptionKeySize: number): void;
    decryptTopicConfigurationMessage(topicConfigurationMessageInBase64: string, privateKey: string): TopicConfigurationObject;
    getTopicEncryptionKeyAndInitVector(topicConfigurationMessageInBase64: string, privateKey: string): TopicEncryptionKeyAndInitVector;
}
