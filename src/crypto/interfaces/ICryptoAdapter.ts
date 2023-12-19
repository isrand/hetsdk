import {IEncryptedTopicKeysObject} from "./IEncryptedTopicKeysObject";
import {ITopicEncryptionKeyAndInitVector} from "../../hedera/interfaces/ITopicEncryptionKeyAndInitVector";
import {ITopicData} from "../../hedera/interfaces/ITopicData";
import {IKeyPair} from "./IKeyPair";

export interface ICryptoAdapter {
    generateKeyPair(): IKeyPair;
    getEncryptedTopicKeysObject(topicEncryptionKey: Buffer, topicEncryptionInitVector: Buffer, publicKeys: string[]): IEncryptedTopicKeysObject;
    symmetricEncrypt(data: string, symmetricKey: Buffer, initVector: Buffer): string;
    symmetricDecrypt(data: string, symmetricKey: Buffer, initVector: Buffer): string;
    validateParticipantKeys(topicParticipants: string[], topicEncryptionKeySize: number): void;
    decryptTopicData(encryptedTopicKeysObject: IEncryptedTopicKeysObject, encryptedTopicDataInBase64: string, privateKey: string): ITopicData;
    getTopicEncryptionKeyAndInitVector(encryptedTopicKeysObject: IEncryptedTopicKeysObject, privateKey: string): ITopicEncryptionKeyAndInitVector;
}
