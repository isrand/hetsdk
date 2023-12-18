/// <reference types="node" />
import { EncryptedTopicKeysObject } from "./EncryptedTopicKeysObject";
import { TopicEncryptionKeyAndInitVector } from "../../hedera/interfaces/TopicEncryptionKeyAndInitVector";
import { TopicData } from "../../hedera/interfaces/TopicData";
import { KeyPair } from "./KeyPair";
export interface CryptoAdapter {
    generateKeyPair(): KeyPair;
    getEncryptedTopicKeysObject(topicEncryptionKey: Buffer, topicEncryptionInitVector: Buffer, publicKeys: string[]): EncryptedTopicKeysObject;
    symmetricEncrypt(data: string, symmetricKey: Buffer, initVector: Buffer): string;
    symmetricDecrypt(data: string, symmetricKey: Buffer, initVector: Buffer): string;
    validateParticipantKeys(topicParticipants: string[], topicEncryptionKeySize: number): void;
    decryptTopicData(encryptedTopicKeysObject: EncryptedTopicKeysObject, encryptedTopicDataInBase64: string, privateKey: string): TopicData;
    getTopicEncryptionKeyAndInitVector(encryptedTopicKeysObject: EncryptedTopicKeysObject, privateKey: string): TopicEncryptionKeyAndInitVector;
}
