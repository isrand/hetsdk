export interface EncryptedTopicKeysObject {
    // "a" is an array containing the encrypted topic keys
    a: Array<string>;

    // "b" is an array containing the encrypted init vector associated with the key
    b: Array<string>;

    // "" is an array only used by the Kyber encryption algorithm to store the encapsulated symmetric keys to decrypt the contents of "a"
    c?: Array<string>;
}
