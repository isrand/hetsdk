import { EncryptedTopicKeysObject } from "../../crypto/interfaces/EncryptedTopicKeysObject";
export interface TopicEncryptionData {
    a: string;
    s: number;
    e: EncryptedTopicKeysObject;
}
