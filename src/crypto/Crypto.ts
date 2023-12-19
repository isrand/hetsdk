import {Kyber} from "./adapters/Kyber";
import {IEncryptedTopicKeysObject} from "./interfaces/IEncryptedTopicKeysObject";
import {ICryptoAdapter} from "./interfaces/ICryptoAdapter";
import {ITopicEncryptionKeyAndInitVector} from "../hedera/interfaces/ITopicEncryptionKeyAndInitVector";
import {ITopicData} from "../hedera/interfaces/ITopicData";
import {RSA} from "./adapters/RSA";
import {IKeyPair} from "./interfaces/IKeyPair";

export class Crypto {
    private adapter: ICryptoAdapter;

    public constructor(private readonly algorithm: string, private readonly size: number) {
        if (algorithm === 'kyber') {
            this.adapter = new Kyber(size);
        } else {
            this.adapter = new RSA();
        }
    }

    public generateKeyPair(): IKeyPair {
        return this.adapter.generateKeyPair();
    }

    public validateParticipantKeys(topicParticipants: string[], topicEncryptionKeySize: number): void {
        this.adapter.validateParticipantKeys(topicParticipants, topicEncryptionKeySize);
    }

    public symmetricEncrypt(data: string, symmetricKey: Buffer, initVector: Buffer) {
        return this.adapter.symmetricEncrypt(data, symmetricKey, initVector)
    }

    public symmetricDecrypt(data: string, symmetricKey: Buffer, initVector: Buffer) {
        return this.adapter.symmetricDecrypt(data, symmetricKey, initVector);
    }

    public getEncryptedTopicKeysObject(topicEncryptionKey: Buffer, topicEncryptionInitVector: Buffer, topicParticipants: string[]): IEncryptedTopicKeysObject {
        return this.adapter.getEncryptedTopicKeysObject(topicEncryptionKey, topicEncryptionInitVector, topicParticipants);
    }

    public decryptTopicData(encryptedTopicKeysObject: IEncryptedTopicKeysObject, encryptedTopicData: string, privateKey: string): ITopicData {
        return this.adapter.decryptTopicData(encryptedTopicKeysObject, encryptedTopicData, privateKey);
    }

    public getTopicEncryptionKeyAndInitVector(encryptedTopicKeysObject: IEncryptedTopicKeysObject, privateKey: string): ITopicEncryptionKeyAndInitVector {
        return this.adapter.getTopicEncryptionKeyAndInitVector(encryptedTopicKeysObject, privateKey);
    }
}
