/// <reference types="node" />
import { IEncryptedTopicKeysObject } from "./interfaces/IEncryptedTopicKeysObject";
import { ITopicEncryptionKeyAndInitVector } from "../hedera/interfaces/ITopicEncryptionKeyAndInitVector";
import { ITopicData } from "../hedera/interfaces/ITopicData";
import { IKeyPair } from "./interfaces/IKeyPair";
export declare class Crypto {
    private readonly algorithm;
    private readonly size;
    private adapter;
    constructor(algorithm: string, size: number);
    generateKeyPair(): IKeyPair;
    validateParticipantKeys(topicParticipants: string[], topicEncryptionKeySize: number): void;
    symmetricEncrypt(data: string, symmetricKey: Buffer, initVector: Buffer): string;
    symmetricDecrypt(data: string, symmetricKey: Buffer, initVector: Buffer): string;
    getEncryptedTopicKeysObject(topicEncryptionKey: Buffer, topicEncryptionInitVector: Buffer, topicParticipants: string[]): IEncryptedTopicKeysObject;
    decryptTopicData(encryptedTopicKeysObject: IEncryptedTopicKeysObject, encryptedTopicData: string, privateKey: string): ITopicData;
    getTopicEncryptionKeyAndInitVector(encryptedTopicKeysObject: IEncryptedTopicKeysObject, privateKey: string): ITopicEncryptionKeyAndInitVector;
}
