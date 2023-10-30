import { EncryptedTopicKeysObject } from "../../crypto/interfaces/EncryptedTopicKeysObject";
export interface TopicEncryptionConfiguration {
    a: string;
    s: number;
    e: EncryptedTopicKeysObject;
}
