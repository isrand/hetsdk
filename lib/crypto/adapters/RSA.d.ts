/// <reference types="node" />
import { ICryptoAdapter } from '../interfaces/ICryptoAdapter';
import { IEncryptedTopicKeysObject } from '../interfaces/IEncryptedTopicKeysObject';
import { ITopicData } from '../../hedera/interfaces/ITopicData';
import { ITopicEncryptionKeyAndInitVector } from '../../hedera/interfaces/ITopicEncryptionKeyAndInitVector';
import { DefaultAdapter } from './DefaultAdapter';
import { IKeyPair } from '../interfaces/IKeyPair';
export declare class RSA extends DefaultAdapter implements ICryptoAdapter {
    private readonly expectedKeyLengthInBase64;
    generateKeyPair(): IKeyPair;
    getEncryptedTopicKeysObject(topicEncryptionKey: Buffer, topicEncryptionInitVector: Buffer, publicKeys: string[]): IEncryptedTopicKeysObject;
    asymmetricEncrypt(data: Buffer, publicKey: string): Buffer;
    asymmetricDecrypt(data: Buffer, privateKey: string): Buffer;
    decryptTopicData(encryptedTopicKeysObject: IEncryptedTopicKeysObject, encryptedTopicDataInBase64: string, privateKey: string): ITopicData;
    getTopicEncryptionKeyAndInitVector(encryptedTopicKeysObject: IEncryptedTopicKeysObject, privateKey: string): ITopicEncryptionKeyAndInitVector;
    validateParticipantKeys(topicParticipants: string[], topicEncryptionKeySize: number): void;
}
