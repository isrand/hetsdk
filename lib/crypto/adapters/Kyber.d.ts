/// <reference types="node" />
import { CryptoAdapter } from "../interfaces/CryptoAdapter";
import { EncryptedTopicKeysObject } from "../interfaces/EncryptedTopicKeysObject";
import { TopicConfigurationObject } from "../../hedera/interfaces/TopicConfigurationObject";
import { TopicEncryptionKeyAndInitVector } from "../../hedera/interfaces/TopicEncryptionKeyAndInitVector";
import { DefaultAdapter } from "./DefaultAdapter";
export declare class Kyber extends DefaultAdapter implements CryptoAdapter {
    private readonly keySize;
    constructor(keySize: number);
    getEncryptedTopicKeysObject(topicEncryptionKey: Buffer, topicEncryptionInitVector: Buffer, publicKeys: string[]): EncryptedTopicKeysObject;
    decryptTopicConfigurationMessage(topicConfigurationMessageInBase64: string, privateKey: string): TopicConfigurationObject;
    getTopicEncryptionKeyAndInitVector(topicConfigurationMessageInBase64: string, privateKey: string): TopicEncryptionKeyAndInitVector;
    validateParticipantKeys(topicParticipants: string[], topicEncryptionKeySize: number): void;
    private decryptEncapsulatedSymmetricKey;
    private getSymmetricAndEncapsulatedKey;
    private getInitVectorFromSymmetricKeyNumberArray;
}
