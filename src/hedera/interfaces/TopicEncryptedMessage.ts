export interface TopicEncryptedMessage {
    // "m" is the encrypted message
    m: string,

    // "k" is the encrypted message encryption key (encrypted using topic encryption key + init vector)
    k: string,

    // "i" is the encrypted message encryption init vector (encrypted using topic encryption key + init vector)
    i: string,
}
