import crypto from "crypto";
import {EncryptedTopicKeysObject} from "../interfaces/EncryptedTopicKeysObject";
import {TopicConfigurationObject} from "../../hedera/interfaces/TopicConfigurationObject";
import {TopicEncryptionData} from "../../hedera/interfaces/TopicEncryptionData";

export class DefaultAdapter {

    public getEncryptedTopicKeysObjectFromTopicConfigurationMessage(topicConfigurationMessageInBase64: string): EncryptedTopicKeysObject {
        const topicConfigurationMessage = JSON.parse(Buffer.from(topicConfigurationMessageInBase64, 'base64').toString('utf8')) as TopicConfigurationObject;
        const topicEncryptionConfigurationObject = JSON.parse(Buffer.from(topicConfigurationMessage.b, 'base64').toString('utf8')) as TopicEncryptionData;

        return topicEncryptionConfigurationObject.e;
    }

    public symmetricEncrypt(data: string, symmetricKey: Buffer, initVector: Buffer): string {
        const messageCipher = crypto.createCipheriv('aes256', Buffer.from(symmetricKey), Buffer.from(initVector));
        let encryptedData = messageCipher.update(data, 'utf-8', 'base64');
        encryptedData += messageCipher.final('base64');

        return encryptedData;
    }

    public symmetricDecrypt(data: string, symmetricKey: Buffer, initVector: Buffer): string {
        const decipher = crypto.createDecipheriv('aes256', Buffer.from(symmetricKey), Buffer.from(initVector));
        let decryptedData = decipher.update(data, 'base64', 'utf-8');
        decryptedData += decipher.final('utf-8');

        return decryptedData;
    }
}
