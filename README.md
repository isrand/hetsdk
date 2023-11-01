# Hedera Hashgraph Encrypted Topic SDK (HETSDK)

This repository contains an NPM package that can be used to create and interact with Encrypted Topics in the Hedera network.

Encrypted Topics are standard Hedera topics that are configured and behave in specific ways to implement private messaging exchanges, most notably with a post-quantum cryptography encryption algorithm: CRYSTALS-Kyber.

## Installation

To install the NPM package, run

```bash
npm install github:isrand/hetsdk
```

## Example

Here is a simple piece of code in TypeScript that you can use to get started quickly. Replace the keys with the real values.

```typescript
import { EncryptedTopic } from 'hetsdk';

// Hedera account data
// Public / private keys must be DER-encoded
const hederaAccountId = '0.0.xxx';
const hederaPrivateKey = '...';
const hederaPublicKey = '...';

// Encryption data, shown below is Kyber
// Keys must be base64-encoded
const kyberPublicKey = '...';
const kyberPrivateKey = '...';

// Someone else's data
const otherHederaPublicKey = '...';
const otherKyberPublicKey = '...';

async function main() {
    // Initialize the encryptedTopic object
    const encryptedTopic = new EncryptedTopic({
        hederaAccountId: hederaAccountId,
        hederaPrivateKey: hederaPrivateKey
    });
    
    // Create a new encrypted topic with Kyber-512 as the encryption algorithm
    const topicId = await encryptedTopic.create({
        participants: [
            {
                publicKey: kyberPublicKey,
                hederaPublicKey: hederaPublicKey
            },
            {
                publicKey: otherKyberPublicKey,
                hederaPublicKey: otherHederaPublicKey
            }
        ],
        algorithm: 'kyber-512',
        storageOptions: {
            storeParticipantsArray: false,
            configuration: StorageOption.Message,
            messages: StorageOption.Message
        },
        metadata: {
            name: "Supply Chain Logistics"
        }
    });
    
    // Submit a message to the encrypted topic
    const messageSequenceNumber = await encryptedTopic.submitMessage(topicId, 'Hey there!', kyberPrivateKey);
    
    // Get a message from the encrypted topic
    const message = await encryptedTopic.getMessage(topicId, messageSequenceNumber, kyberPrivateKey);
    console.log(message); // "Hey there!"
}

main();
```

> Note: the above piece of code may fail due to issues when connecting to the Hedera Network, or due to consensus delays. Ensure that enough time has passed between topic creation, message submission and subsequent fetching of the message.

# Storage

The SDK can be configured to store the two main artifacts (topic configuration message and encrypted messages) either in the Consensus Service as standard messages, or in the File Service as files (which are then referenced in a Consensus Service message).
These artifact storage mediums are decoupled, meaning that you can choose to store the topic configuration message in the File Service and the messages in the Consensus Service, and viceversa.
There are benefits and drawbacks to each medium:

- Consensus Service: the cheaper approach, but it's limited to messages of at most 20 chunks in size, each chunk being at most 1024KB in length. Good for use cases with few participants (see table below) and / or small message sizes, like simple JSON payloads.
- File Service: a bit more costly, but it allows for more topic participants and / or bigger messages. It also opens the door for new participants to be added in the future via file updates (currently not implemented).

When creating a topic you can choose whether to store the participants array to keep track of them or not.

To set the storage medium, simply set the `storageOptions` object when calling the `create` method:


```typescript
storageOptions: {
    storeParticipantsArray: true | false
    configuration: StorageOption.Message | StorageOption.File // Consensus Service or File Service
    messages: StorageOption.Message | StorageOption.File // Consensus Service or File Service
}
```

> Topics are configured from the start to use one approach or the other, and currently can't be changed after creation. Further decoupling is in the works to allow for a fully hybrid approach.

### Consensus Service Limitations

When using the Consensus Service as the storage medium for the topic configuration message, the following table describes the maximum number of participants that can be part of said topic, assuming no topic metadata object is passed. Providing a rich topic metadata object will reduce the remaining available size for extra participants.


| Encryption algorithm | Max number of participants (storing participant list) | Max number of participants (without storing participant list) |
|----------------------|-------------------------------------------------------|---------------------------------------------------------------|
| RSA-2048             | 7                                                     | 16                                                            |
| Kyber-512            | 4                                                     | 9                                                             |
| Kyber-768            | 3                                                     | 7                                                             |
| Kyber-1024           | 2                                                     | 5                                                             |


## Encryption process

The SDK uses a topic-wide symmetric key for encryption: `tek`. The topic configuration object, containing the submit key for the topic, is encrypted with `tek`.

`tek` is encrypted with each participant's public key, be it Kyber or RSA-2048.

Messages are encrypted with a one-time use symmetric key: `mek`, that in turn is encrypted with `tek` and placed next to the encrypted payload.

Users with access to `tek` can then decrypt `mek` and see the contents of the message.

Furthermore, messages can be decrypted and shared by distributing their `mek`, without compromising the privacy of the rest of the messages of the topic. This can be useful for auditing purposes.

# In the works

- Calculate maximum possible JSON payload size with Consensus Service as storage medium for messages.
- Calculate maximum possible JSON payload size with File Service as storage medium for messages.
- Calculate maximum number of participants possible with File Service as storage medium for topic configuration message given an empty topic metadata object.
