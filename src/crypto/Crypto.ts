import {Kyber} from "./adapters/Kyber";
import {EncryptedTopicKeysObject} from "./interfaces/EncryptedTopicKeysObject";
import {CryptoAdapter} from "./interfaces/CryptoAdapter";
import {TopicEncryptionKeyAndInitVector} from "../hedera/interfaces/TopicEncryptionKeyAndInitVector";
import {TopicData} from "../hedera/interfaces/TopicData";
import {RSA} from "./adapters/RSA";

export class Crypto {
    private adapter: CryptoAdapter;

    public constructor(private readonly algorithm: string, private readonly size: number) {
        if (algorithm === 'kyber') {
            this.adapter = new Kyber(size);
        } else {
            this.adapter = new RSA();
        }
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

    public getEncryptedTopicKeysObject(topicEncryptionKey: Buffer, topicEncryptionInitVector: Buffer, topicParticipants: string[]): EncryptedTopicKeysObject {
        return this.adapter.getEncryptedTopicKeysObject(topicEncryptionKey, topicEncryptionInitVector, topicParticipants);
    }

    public decryptTopicConfigurationMessage(topicConfigurationMessageInBase64: string, privateKey: string): TopicData {
        return this.adapter.decryptTopicConfigurationMessage(topicConfigurationMessageInBase64, privateKey);
    }

    public getTopicEncryptionKeyAndInitVector(topicConfigurationMessageInBase64: string, privateKey: string): TopicEncryptionKeyAndInitVector {
        return this.adapter.getTopicEncryptionKeyAndInitVector(topicConfigurationMessageInBase64, privateKey);
    }
}
