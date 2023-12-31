# Hedera Hashgraph Encrypted Topic SDK (HETSDK)
![](https://img.shields.io/badge/license-Apache_2.0-green)

![](img/badge-lines.svg)
![](img/badge-functions.svg)
![](img/badge-statements.svg)
![](img/badge-branches.svg)

This repository contains an NPM package that can be used to create and interact with Encrypted Topics in the Hedera network.

Encrypted Topics are standard Hedera topics that are configured and behave in specific ways to implement private messaging exchanges, most notably with a post-quantum cryptography encryption algorithm: CRYSTALS-Kyber.

## Table of contents

- [Introduction](#introduction)
- [Installation](#installation)
- [Example](#example)
- [API](#api-reference)
  - [generateKeyPair](#generatekeypair-algorithm)
  - [create](#create-createencryptedtopicconfiguration)
  - [submitMessage](#submitmessage-message)
  - [addParticipant](#addparticipant-publickey-forwardsecrecy)
  - [getMessage](#getmessage-messagesequencenumber)
  - [getParticipants](#getparticipants-)
  - [rotateEncryptionKey](#rotateencryptionkey-)
- [Storage](#storage)
  - [Consensus Service](#consensus-service)
- [Encryption process](#encryption-process)
- [In the works](#in-the-works)

## Introduction

The Hedera Hashgraph Encrypted Topic SDK is an NPM package that provides a layer of abstraction above the `@hashgraph/sdk` package when dealing with Consensus Service topics. It adds an extra layer of privacy for users that want to implement multi-party private message exchanges using the Hedera Network.

It has been developed as the backbone for enterprise applications that want to leverage the low costs and efficient consensus algorithm that the Hedera Network provides.

The SDK provides a great deal of flexibility in terms of the amount of data that's stored. Take a look at each method's input parameters to fine-tune the use of the SDK to your particular case.

A feature is in development to provide recommendations on storage options given sample use cases.

> [!WARNING]
> The Hedera Network will keep every transaction you create in its ledgers, forever. Be mindful of the information you choose to share and the encryption algorithm that you will use.
> _Harvest now, decrypt later_ techniques must be thought of as happening constantly given the open nature of the Network.
>
> The current implementation of CRYSTALS-Kyber is subject to future change as new attacks are discovered and mitigations are implemented.

## Installation

To install the NPM package, run

```bash
npm install github:isrand/hetsdk
```

## Example

Here is a simple piece of code in JavaScript that you can use to get started quickly. Replace the keys with the real values.

> [!NOTE]
> The SDK also provides type definitions for TypeScript.

### Creating a new topic

```javascript
const EncryptedTopic = require('hetsdk').EncryptedTopic;
const EncryptionAlgorithms = require('hetsdk/lib/crypto/enums/EncryptionAlgorithms').EncryptionAlgorithms;
const StorageOptions = require('hetsdk/lib/hedera/enums/StorageOptions').StorageOptions;

// Hedera account data
// Private keys must be DER-encoded
const hederaAccountId = '0.0.abc';
const hederaPrivateKey = '...';

// Encryption data, shown below is Kyber
// Keys must be base64-encoded
const kyberPublicKey = '...';
const kyberPrivateKey = '...';

// Someone else's data
const otherKyberPublicKey = '...';

async function main() {
  // Initialize the encryptedTopic object
  const encryptedTopic = new EncryptedTopic({
    hederaAccountId: hederaAccountId,
    hederaPrivateKey: hederaPrivateKey,
    privateKey: kyberPrivateKey
  });

  // Create a new encrypted topic with Kyber-512 as the encryption algorithm
  const topicId = await encryptedTopic.create({
    participants: [kyberPublicKey, otherKyberPublicKey],
    algorithm: EncryptionAlgorithms.Kyber512,
    storageOptions: {
      storeParticipants: false,
      configuration: StorageOptions.Message,
      messages: StorageOptions.Message
    },
    metadata: {
      name: "Supply Chain Logistics"
    }
  });
  
  console.log('Topic created. Topic ID: ', topicId);

  // Submit a message to the encrypted topic
  const messageSequenceNumber = await encryptedTopic.submitMessage('Hey there!');

  // Get a message from the encrypted topic
  const message = await encryptedTopic.getMessage(messageSequenceNumber);
  console.log(message); // "Hey there!"
}

main();
```

This code will create a topic with two participants from the get go. The configuration message will be stored in the Consensus Service itself, so new participants can't be added later down the line.

Messages are also stored in the Consensus Service. This is a good use case for processes that transact small JSON payloads.

### Targeting an existing encrypted topic

If you are interacting with an encrypted topic that was already created, you need to specify the topic ID in the constructor of the `EncryptedTopic` object.

```javascript
const EncryptedTopic = require('hetsdk').EncryptedTopic;
const EncryptionAlgorithms = require('hetsdk/lib/crypto/enums/EncryptionAlgorithms').EncryptionAlgorithms;
const StorageOptions = require('hetsdk/lib/hedera/enums/StorageOptions').StorageOptions;

// Hedera account data
// Private keys must be DER-encoded
const hederaAccountId = '0.0.abc';
const hederaPrivateKey = '...';

// Encryption data, shown below is Kyber
// Keys must be base64-encoded
const kyberPrivateKey = '...';

const topicId = '0.0.xyz';

async function main() {
  // Initialize the encryptedTopic object
  const encryptedTopic = new EncryptedTopic({
    hederaAccountId: hederaAccountId,
    hederaPrivateKey: hederaPrivateKey,
    privateKey: kyberPrivateKey,
    topicId: topicId
  });

  // Submit a message to the encrypted topic
  const messageSequenceNumber = await encryptedTopic.submitMessage('Hey there!');

  // Get a message from the encrypted topic
  const message = await encryptedTopic.getMessage(messageSequenceNumber);
  console.log(message); // "Hey there!"
}

main();
```

> The above pieces of code may fail due to issues when connecting to the Hedera Network, or due to consensus delays. Ensure that enough time has passed between topic creation, message submission and subsequent fetching of the message.

## API Reference

### `generateKeyPair (algorithm)`

**Description**

Static method that returns a public / private key pair given the algorithm. It does not require the `EncryptedTopic` object to have been initialized.

**Parameters**

- `algorithm (EncryptionAlgorithms)`:  Enum that specifies the encryption algorithm and key size. Possible options are: `EncryptionAlgorithms.RSA2048`, `EncryptionAlgorithms.Kyber512`, `EncryptionAlgorithms.Kyber768`, `EncryptionAlgorithms.Kyber1024`.

**Usage**

```typescript
const keyPair = EncryptedTopic.generateKeyPair(EncryptionAlgorithms.Kyber512);
```

**Return value**

`keyPair (KeyPair)`: Object containing `publicKey` and `privateKey`. Both are base64 encoded already.

---

### `create (createEncryptedTopicConfiguration)`

**Description**

Create a new encrypted topic. The user creating the topic is hereinafter referred to as the "encrypted topic admin", and only they can perform changes on the topic configuration or participants.

Choosing to store the participants will create a separate topic and store their public keys there. This is useful to know exactly which participants are part of which topic and, in the future, to implement perfect forward secrecy and be able to rotate the topic encryption key.
Please note that storing participants will incur in higher costs as **two** topics will be created at the end of this operation.

**Parameters**

- `createEncryptedTopicConfiguration (CreateEncryptedTopicConfiguration)`: Object containing the parameters used to configure the encrypted topic. It contains the following keys:
  - `participants (string[])`: Array of base64-encoded public keys used for encryption. The key's algorithm must match the chosen topic encryption algorithm.
  - `algorithm (EncryptionAlgorithms)`:  Enum that specifies the encryption algorithm and key size. Possible options are: `EncryptionAlgorithms.RSA2048`, `EncryptionAlgorithms.Kyber512`, `EncryptionAlgorithms.Kyber768`, `EncryptionAlgorithms.Kyber1024`.
  - `storageOptions (TopicStorageOptions)`: Object containing storage options for the topic artifacts:
    - `configuration (StorageOptions)`: Enum that specifies File Service (`StorageOptions.File`) or Consensus Service (`StorageOptions.Message`).
    - `messages (StorageOptions)`: Enum that specifies File Service (`StorageOptions.File`) or Consensus Service (`StorageOptions.Message`).
    - `storeParticipants (boolean)`: Boolean that specifies whether to store the participants array in a separate topic or not.
  - `metadata (?any)`: Object containing topic metadata

> For more information about artifact storage, check the [storage](#storage) section.

**Usage**

```typescript
const topicId = await encryptedTopic.create({
  participants: [kyberPublicKey],
  algorithm: EncryptionAlgorithms.Kyber512,
  storageOptions: {
    storeParticipants: false,
    configuration: StorageOptions.Message,
    messages: StorageOptions.Message
  },
  metadata: {
    name: "Supply Chain Logistics"
  }
});
```

**Return value**

`topicId (string)`: id of the newly created topic.

---

### `submitMessage (message)`

**Description**

Submit a message on an encrypted topic. The participant must have access to the topic in order to submit messages.

**Parameters**

- `message (string)`: String containing the message contents. If you want to transact a JSON payload, make sure to `JSON.stringify()` it first.

**Usage**

```typescript
const messageSequenceNumber = await encryptedTopic.submitMessage('Hey there!');
```

**Return value**

`messageSequenceNumber (number)`: sequence number of the message in the topic.

or

`ERROR`: if the user doesn't have access to the topic.

---

### `addParticipant (publicKey, forwardSecrecy)`

**Description**

Adds new participant to the encrypted topic, only if the storage medium of said topic for the configuration is set to File Service and the user can update the configuration file.

**Parameters**

- `publicKey (string)`: Base64-encoded public key of the new participant used for encryption. The key's algorithm must match the chosen topic encryption algorithm.
- `forwardSecrecy (?boolean)`: Whether to rotate the topic encryption key before the new participant is added. If set to `true`, the new participant will **not** be able to decrypt the messages from the topic before they were added.

**Usage**

```typescript
const additionSuccess = await encryptedTopic.addParticipant(otherKyberPublicKey, false);
```

**Return value**

`additionSuccess (boolean)`: boolean determining if the participant was added correctly or not.

or

`ERROR`: if the user doesn't have access to the topic, the participant can't be added or the topic is configured to use the Consensus Servie as the storage medium for the topic configuration message.

---

### `getMessage (messageSequenceNumber)`

**Description**

Get message from an encrypted topic given its sequence number. The participant must have access to the topic in order to get messages.

**Parameters**

- `messageSequenceNumber (number)`: Sequence of the number you want to fetch.

**Usage**

```typescript
const message = await encryptedTopic.getMessage(messageSequenceNumber);
```

**Return value**

`message (string)`: string with message contents.

or

`ERROR`: if the sequence number provided is greater than the current sequence number of the topic, or the user doesn't have access to the topic.

---

### `getParticipants ()`

**Description**

Get the participants belonging to a topic, only if the encrypted topic admin chose to store them upon topic creation.

**Usage**

```typescript
const participants = await encryptedTopic.getParticipants();
```

**Return value**

`participants (string[])`: array of strings representing the public keys of the participants of the topic.

---

### `rotateEncryptionKey ()`

**Description**

Rotate the topic encryption key. This method requires the storage of the topic participants to work.

**Usage**

```typescript
await encryptedTopic.rotateEncryptionKey();
```

---

## Storage

The SDK can be configured to store the two main artifacts (topic configuration message and encrypted messages) either in the Consensus Service as standard messages, or in the File Service as files (which are then referenced in a Consensus Service message).
These artifact storage mediums are decoupled, meaning that you can choose to store the topic configuration message in the File Service and the messages in the Consensus Service, and viceversa.
There are benefits and drawbacks to each medium.

- Consensus Service: the cheaper approach, but it's limited to messages of at most 20 chunks in size, each chunk being at most 1024KB in length. Good for use cases with few participants (see table below) and / or small message sizes, like simple JSON payloads.
- File Service: a bit more costly, but it allows for more topic participants and / or bigger messages, plus addition of new topic participants down the line.

When creating a topic you can choose whether to store the participants array to keep track of them or not.

To set the storage medium, simply set the `storageOptions` object when calling the `create` method:

```typescript
storageOptions: {
    storeParticipants: true | false
    configuration: StorageOptions.Message | StorageOptions.File // Consensus Service or File Service
    messages: StorageOptions.Message | StorageOptions.File // Consensus Service or File Service
}
```

The storage options are themselves stored as the topic memo, so the SDK can know at a glance which storage medium to use when fetching the artifacts.

> Topics are configured from the start to use one approach or the other, and currently can't be changed after creation. Further decoupling is in the works to allow for a fully hybrid approach.

### Consensus Service

The cheaper approach, but it's limited to messages of at most 20 chunks in size, each chunk being at most 1024KB in length. Good for use cases with few participants (see table below) and / or small message sizes, like simple JSON payloads.

#### Limits: topic configuration message

The following table describes the maximum number of participants that can be part of said topic, assuming no topic metadata object is passed. Providing a rich topic metadata object will reduce the remaining available size for extra participants.

| Algorithm  | Number of participants |
|------------|------------------------|
| RSA-2048   | 16                     |
| Kyber-512  | 13                     |         
| Kyber-768  | 9                      |
| Kyber-1024 | 6                      |

#### Limits: topic messages

The maximum size for a string message or stringified JSON payload is ~ `11350 B (11.35 kB)`

## Encryption process

The SDK uses a topic-wide symmetric key for encryption: `tek`. The topic configuration object, containing the submit key for the topic, is encrypted with `tek`.

`tek` is encrypted with each participant's public key, be it Kyber or RSA-2048.

Messages are encrypted with a one-time use symmetric key: `mek`, that in turn is encrypted with `tek` and placed next to the encrypted payload.

Users with access to `tek` can then decrypt `mek` and see the contents of the message.

Furthermore, messages can be decrypted and shared by distributing their `mek`, without compromising the privacy of the rest of the messages of the topic. This can be useful for auditing purposes.

## In the works

- Calculate maximum possible JSON payload size with File Service as storage medium for messages.
- Calculate maximum number of participants possible with File Service as storage medium for topic configuration message given an empty topic metadata object.
- Provide a method to calculate storage costs and provide the user with recommendations on which storage medium to use.
