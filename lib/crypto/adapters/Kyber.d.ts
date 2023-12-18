/// <reference types="node" />
import { CryptoAdapter } from "../interfaces/CryptoAdapter";
import { EncryptedTopicKeysObject } from "../interfaces/EncryptedTopicKeysObject";
import { TopicData } from "../../hedera/interfaces/TopicData";
import { TopicEncryptionKeyAndInitVector } from "../../hedera/interfaces/TopicEncryptionKeyAndInitVector";
import { DefaultAdapter } from "./DefaultAdapter";
import { KeyPair } from "../interfaces/KeyPair";
export declare class Kyber extends DefaultAdapter implements CryptoAdapter {
    private readonly keySize;
    constructor(keySize: number);
    generateKeyPair(): KeyPair;
    getEncryptedTopicKeysObject(topicEncryptionKey: Buffer, topicEncryptionInitVector: Buffer, publicKeys: string[]): EncryptedTopicKeysObject;
    decryptTopicData(encryptedTopicKeysObject: EncryptedTopicKeysObject, encryptedTopicDataInBase64: string, privateKey: string): TopicData;
    getTopicEncryptionKeyAndInitVector(encryptedTopicKeysObject: EncryptedTopicKeysObject, privateKey: string): TopicEncryptionKeyAndInitVector;
    validateParticipantKeys(topicParticipants: string[], topicEncryptionKeySize: number): void;
    private decryptEncapsulatedSymmetricKey;
    private getSymmetricAndEncapsulatedKey;
    private getInitVectorFromSymmetricKeyNumberArray;
}
