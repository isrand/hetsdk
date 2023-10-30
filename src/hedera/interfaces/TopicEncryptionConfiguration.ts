import {EncryptedTopicKeysObject} from "../../crypto/interfaces/EncryptedTopicKeysObject";

export interface TopicEncryptionConfiguration {
    // "a" is the name of the algorithm (kyber | RSA)
    a: string;

    // "s" is the key size (512, 768 or 1024 for kyber, or 2048 for RSA)
    s: number;

    // "e" is an object containing the encrypted topic keys
    e: EncryptedTopicKeysObject;
}
