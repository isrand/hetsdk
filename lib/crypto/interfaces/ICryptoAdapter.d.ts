/// <reference types="node" />
import { IEncryptedTopicKeysObject } from './IEncryptedTopicKeysObject';
import { ITopicEncryptionKeyAndInitVector } from '../../hedera/interfaces/ITopicEncryptionKeyAndInitVector';
import { ITopicData } from '../../hedera/interfaces/ITopicData';
import { IKeyPair } from './IKeyPair';
export interface ICryptoAdapter {
    generateKeyPair: () => IKeyPair;
    getEncryptedTopicKeysObject: (topicEncryptionKey: Buffer, topicEncryptionInitVector: Buffer, publicKeys: Array<string>) => IEncryptedTopicKeysObject;
    symmetricEncrypt: (dataToEncrypt: string, symmetricKey: Buffer, initVector: Buffer) => string;
    symmetricDecrypt: (dataToDecrypt: string, symmetricKey: Buffer, initVector: Buffer) => string;
    validateParticipantKeys: (topicParticipants: Array<string>, topicEncryptionKeySize: number) => void;
    decryptTopicData: (encryptedTopicKeysObject: IEncryptedTopicKeysObject, encryptedTopicDataInBase64: string, privateKey: string) => ITopicData;
    getTopicEncryptionKeyAndInitVector: (encryptedTopicKeysObject: IEncryptedTopicKeysObject, privateKey: string) => ITopicEncryptionKeyAndInitVector;
}
