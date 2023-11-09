/// <reference types="node" />
import { CryptoAdapter } from "../interfaces/CryptoAdapter";
import { EncryptedTopicKeysObject } from "../interfaces/EncryptedTopicKeysObject";
import { TopicConfigurationObject } from "../../hedera/interfaces/TopicConfigurationObject";
import { TopicEncryptionKeyAndInitVector } from "../../hedera/interfaces/TopicEncryptionKeyAndInitVector";
import { DefaultAdapter } from "./DefaultAdapter";
export declare class RSA extends DefaultAdapter implements CryptoAdapter {
    private readonly expectedKeyLengthInBase64;
    getEncryptedTopicKeysObject(topicEncryptionKey: Buffer, topicEncryptionInitVector: Buffer, publicKeys: string[]): EncryptedTopicKeysObject;
    asymmetricEncrypt(data: Buffer, publicKey: string): Buffer;
    asymmetricDecrypt(data: Buffer, privateKey: string): Buffer;
    decryptTopicConfigurationMessage(topicConfigurationMessageInBase64: string, privateKey: string): TopicConfigurationObject;
    getTopicEncryptionKeyAndInitVector(topicConfigurationMessageInBase64: string, privateKey: string): TopicEncryptionKeyAndInitVector;
    validateParticipantKeys(topicParticipants: string[], topicEncryptionKeySize: number): void;
}
