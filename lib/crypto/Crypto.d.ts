/// <reference types="node" />
import { EncryptedTopicKeysObject } from "./interfaces/EncryptedTopicKeysObject";
import { TopicEncryptionKeyAndInitVector } from "../hedera/interfaces/TopicEncryptionKeyAndInitVector";
import { TopicData } from "../hedera/interfaces/TopicData";
import { KeyPair } from "./interfaces/KeyPair";
export declare class Crypto {
    private readonly algorithm;
    private readonly size;
    private adapter;
    constructor(algorithm: string, size: number);
    generateKeyPair(): KeyPair;
    validateParticipantKeys(topicParticipants: string[], topicEncryptionKeySize: number): void;
    symmetricEncrypt(data: string, symmetricKey: Buffer, initVector: Buffer): string;
    symmetricDecrypt(data: string, symmetricKey: Buffer, initVector: Buffer): string;
    getEncryptedTopicKeysObject(topicEncryptionKey: Buffer, topicEncryptionInitVector: Buffer, topicParticipants: string[]): EncryptedTopicKeysObject;
    decryptTopicData(encryptedTopicKeysObject: EncryptedTopicKeysObject, encryptedTopicData: string, privateKey: string): TopicData;
    getTopicEncryptionKeyAndInitVector(encryptedTopicKeysObject: EncryptedTopicKeysObject, privateKey: string): TopicEncryptionKeyAndInitVector;
}
