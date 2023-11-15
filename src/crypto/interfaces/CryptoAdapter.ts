import {EncryptedTopicKeysObject} from "./EncryptedTopicKeysObject";
import {TopicEncryptionKeyAndInitVector} from "../../hedera/interfaces/TopicEncryptionKeyAndInitVector";
import {TopicData} from "../../hedera/interfaces/TopicData";

export interface CryptoAdapter {
    getEncryptedTopicKeysObject(topicEncryptionKey: Buffer, topicEncryptionInitVector: Buffer, publicKeys: string[]): EncryptedTopicKeysObject;
    symmetricEncrypt(data: string, symmetricKey: Buffer, initVector: Buffer): string;
    symmetricDecrypt(data: string, symmetricKey: Buffer, initVector: Buffer): string;
    validateParticipantKeys(topicParticipants: string[], topicEncryptionKeySize: number): void;
    decryptTopicConfigurationMessage(topicConfigurationMessageInBase64: string, privateKey: string): TopicData;
    getTopicEncryptionKeyAndInitVector(topicConfigurationMessageInBase64: string, privateKey: string): TopicEncryptionKeyAndInitVector;
}
