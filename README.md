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
        storeParticipantsArray: false, // Don't store the participants array for space-saving purposes
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

## Encryption process

The SDK uses a topic-wide symmetric key for encryption: `tek`. The topic configuration object, containing the submit key for the topic, is encrypted with `tek`.

`tek` is encrypted with each participant's public key, be it Kyber or RSA-2048.

Messages are encrypted with a one-time use symmetric key: `mek`, that in turn is encrypted with `tek` and placed next to the encrypted payload.

Users with access to `tek` can then decrypt `mek` and see the contents of the message.

Furthermore, messages can be decrypted and shared by distributing their `mek`, without compromising the privacy rest of the messages of the topic. This can be useful for auditing purposes.


## Limitations

When using the Hedera Hashgraph network, space is at a premium. Consensus Service messages are limited to 20 chunks in size, each chunk being 1024 bytes of length at maximum.

The SDK sends the Topic Configuration Message as a Consensus Service message, which means that there is an upper limit to the size of the topic metadata object, or the amount of participants that can be added to an encrypted topic.
Larger, more secure key sizes (like Kyber-1024) will also affect the maximum length of the Topic Configuration Message.

> You can choose to **not** store the participants array in the Topic Configuration to save space. However, by doing so you will not be able to see or know the topic participants


Below is a reference table with the maximum number of participants allowed per encrypted topic (assuming no topic metadata is passed):

| Encryption algorithm | Max number of participants (storing participant list) | Max number of participants (without storing participant list) |
|----------------------|-------------------------------------------------------|---------------------------------------------------------------|
| RSA-2048             | 7                                                     | 16                                                            |
| Kyber-512            | 4                                                     | 9                                                             |
| Kyber-768            | 3                                                     | 7                                                             |
| Kyber-1024           | 2                                                     | 5                                                             |

> Feel free to change the implementation of the package to utilise the File Service to store the Encrypted Topic Configuration Message. Doing so would also open the door to adding new participants to a topic via file update transactions, for just a few more cents.
