/// <reference types="node" />
import { EncryptedTopicKeysObject } from "../interfaces/EncryptedTopicKeysObject";
export declare class DefaultAdapter {
    getEncryptedTopicKeysObjectFromTopicConfigurationMessage(topicConfigurationMessageInBase64: string): EncryptedTopicKeysObject;
    symmetricEncrypt(data: string, symmetricKey: Buffer, initVector: Buffer): string;
    symmetricDecrypt(data: string, symmetricKey: Buffer, initVector: Buffer): string;
}
