/// <reference types="node" />
import { CryptoAdapter } from "../interfaces/CryptoAdapter";
import { EncryptedTopicKeysObject } from "../interfaces/EncryptedTopicKeysObject";
import { TopicParticipant } from "../../hedera/interfaces/TopicParticipant";
import { TopicConfigurationObject } from "../../hedera/interfaces/TopicConfigurationObject";
import { TopicEncryptionKeyAndInitVector } from "../../hedera/interfaces/TopicEncryptionKeyAndInitVector";
export declare class Kyber implements CryptoAdapter {
    private readonly keySize;
    constructor(keySize: number);
    getEncryptedTopicKeysObject(topicEncryptionKey: Buffer, topicEncryptionInitVector: Buffer, topicParticipants: Array<TopicParticipant>): EncryptedTopicKeysObject;
    symmetricEncrypt(data: string, symmetricKey: Buffer, initVector: Buffer): string;
    symmetricDecrypt(data: string, symmetricKey: Buffer, initVector: Buffer): string;
    decryptTopicConfigurationMessage(topicConfigurationMessageInBase64: string, privateKey: string): TopicConfigurationObject;
    getTopicEncryptionKeyAndInitVector(topicConfigurationMessageInBase64: string, privateKey: string): TopicEncryptionKeyAndInitVector;
    validateParticipantKeys(topicParticipants: Array<TopicParticipant>, topicEncryptionKeySize: number): void;
    private decryptEncapsulatedSymmetricKey;
    private getSymmetricAndEncapsulatedKey;
    private getInitVectorFromSymmetricKeyNumberArray;
}
