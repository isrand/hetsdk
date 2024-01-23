# Hedera Hashgraph Encrypted Topic SDK (HETSDK)
![](https://img.shields.io/badge/license-Apache_2.0-green)

This repository contains an NPM package that can be used to create and interact with Encrypted Topics in the Hedera network.

Encrypted Topics are standard Hedera topics that are configured and behave in specific ways to implement private messaging exchanges, most notably with a quantum-resistant encryption algorithm: [CRYSTALS-Kyber](https://pq-crystals.org/kyber/).

## Table of contents

- [Introduction](#introduction)
- [Encryption](#encryption)
  - [Topic configuration](#topic-configuration)
  - [Topic messages](#topic-messages)
  - [Topic encryption key rotation](#topic-encryption-key-rotation)
- [Installation](#installation)
- [Example](#example)
- [Cost calculator](#example)
- [Testing](#testing)
  - [Unit testing](#unit-testing)
  - [Flow testing](#flow-testing)
  - [Cost calculator testing](#cost-calculator-testing)
- [API](#api-reference)
  - [addParticipant](#addparticipant-publickey-forwardsecrecy)
  - [create](#create-createencryptedtopicconfiguration)
  - [generateKeyPair](#generatekeypair-algorithm)
  - [getMessage](#getmessage-messagesequencenumber)
  - [getParticipants](#getparticipants-)
  - [migrateConfigurationStorageMedium](#migrateconfigurationstoragemedium-)
  - [rotateEncryptionKey](#rotateencryptionkey-)
  - [storeParticipants](#storeparticipants-oldparticipantspublickeys)
  - [submitMessage](#submitmessage-message-medium)

## Introduction

The Hedera Hashgraph Encrypted Topic SDK is an NPM package that provides a layer of abstraction above the `@hashgraph/sdk` package when dealing with Consensus Service topics. It adds an extra layer of privacy for users that want to implement multi-party private message exchanges using the Hedera Network.

It has been developed as the backbone for enterprise applications that want to leverage the low costs and efficient consensus algorithm that the Hedera Network provides.

The SDK provides a great deal of flexibility in terms of the amount of data that's stored. Take a look at each method's input parameters to fine-tune the use of the SDK to your particular case.

> [!WARNING]
> The Hedera Network will keep every transaction you create in its ledgers, forever. Be mindful of the information you choose to share and the encryption algorithm that you will use.
> _Harvest now, decrypt later_ techniques must be thought of as happening constantly given the open nature of the Network.
>
> The current implementation of CRYSTALS-Kyber is subject to future change as new attacks are discovered and mitigations are implemented.

## Encryption

### Topic configuration

The SDK uses a topic-wide symmetric key for encryption: `tek` (plus corresponding init vector, `tiv`). An object containing the submit key for the topic and any extra metadata is encrypted with `tek` + `tiv` using `AES-256-GCM`.

`tek` is encrypted with each participant's public key and stored next to the encrypted submit key and metadata in a string called topic configuration message `tcm`.

The `tcm` contains all the necessary information to initialise the SDK and access an encrypted topic. It has the following format:

```

   1     2     3                            4
"{...}#{...}#{...}#{p1_tek}_{p1_tiv}_{?p1_c}#{p2_tek}_{p2_tiv}_{?p2_c}"

{1}: Base64-encoded encrypted submit key + metadata
{2}: Encryption algorithm (Kyber, RSA)
{3}: Encryption key size (512, 768, 1024, 2048)
{4}: Array of encrypted tek + tiv per participant (plus Kyber encapsulated symmetric key if necessary)
```

The `tcm` is stored either in the Consensus Service or in the File Service, depending on how the encrypted topic is set up.

### Topic messages

Messages are encrypted using `AES-256-GCM` with a one-time use symmetric key: `mek`, that in turn is encrypted with `tek` and placed next to the encrypted payload.

Users with access to `tek` can then decrypt `mek` and see the contents of the message.

Furthermore, messages can be decrypted and shared by distributing their `mek`, without compromising the privacy of the rest of the messages of the topic. This can be useful for auditing purposes.

### Topic encryption key rotation

At any given point, if the participant public keys are stored, the encrypted topic admin can choose to rotate the topic encryption key for security purposes, either through the `rotateEncryptionKey` public method or when adding a new participant via forward secrecy (check API reference for more information).

This process creates a duplicate of the previous `tcm`, creating a new `tek` and `tiv` and encrypting them again with the participants' public keys. A comma `,` is added as a separating character for the SDK to be able to parse the different `tcm` versions.
The length of the array resulting from splitting the `tcm` string (`tcm.split(',')`) determines the revisions of the `tcm`. The latest version (`length - 1`) is used as the authoritative version for encryption.

Messages contain a reference to the version that was used to encrypt them. The SDK can fetch said version by parsing the `tcm` and decrypt messages that were encrypted before topic encryption key rotations.

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
      configuration: StorageOptions.Message
    },
    metadata: {
      name: "Supply Chain Logistics"
    }
  });
  
  console.log('Topic created. Topic ID: ', topicId);

  // Submit a message to the encrypted topic
  const messageSequenceNumber = await encryptedTopic.submitMessage('Hey there!', StorageOptions.Message);

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
  const messageSequenceNumber = await encryptedTopic.submitMessage('Hey there!', StorageOptions.Message);

  // Get a message from the encrypted topic
  const message = await encryptedTopic.getMessage(messageSequenceNumber);
  console.log(message); // "Hey there!"
}

main();
```

> The above pieces of code may fail due to issues when connecting to the Hedera Network, or due to consensus delays. Ensure that enough time has passed between topic creation, message submission and subsequent fetching of the message.

## Cost calculator

The SDK provides a mock stub to calculate the approximate cost of performing operations on the Network. These values have been gathered after running the flows several times, targeting the Hedera Testnet, averaging the costs.
They are a very rough estimate and fluctuate constantly.

The snippet below contains the cost (in USD) of the main operations:

```
ConsensusCreateTopic = 0.0110
ConsensusUpdateTopic = 0.000100
ConsensusGetTopicInfo = 0.000100
ConsensusSubmitMessagePerCharacter = 0.00000032
ConsensusGetMessage = 0.000100

FileCreate = 0.0390
FileAppendPerCharacter = 0.000025
FileGetContents = 0.00010
```

> [!NOTE]
> As of now I am not aware of any Hedera API that returns these values in realtime, which would be really helpful.
Should this change in the future I'll develop a smarter approach.

You can initialise the `EncryptedTopic` object with the mock stub, which effectively sets it to run in "dry-run" mode, set up your flow and calculate the total cost at the end. Here is an example piece of code to do so:

```javascript
const EncryptedTopic = require('hetsdk').EncryptedTopic;
const EncryptionAlgorithms = require('hetsdk/lib/crypto/enums/EncryptionAlgorithms').EncryptionAlgorithms;
const StorageOptions = require('hetsdk/lib/hedera/enums/StorageOptions').StorageOptions;
const HederaStubCostCalculator = require('hetsdk/lib/hedera/calculator/HederaStubCostCalculator').HederaStubCostCalculator;

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

// Initialise the cost calculator
const hederaStubCostCalculator = new HederaStubCostCalculator();

async function main() {
  // Initialize the encryptedTopic object
  const encryptedTopic = new EncryptedTopic({
    hederaAccountId: hederaAccountId,
    hederaPrivateKey: hederaPrivateKey,
    privateKey: kyberPrivateKey
  }, hederaStubCostCalculator);     // Initialise the EncryptedObject with the cost calculator

  // Create a new encrypted topic with Kyber-512 as the encryption algorithm
  const topicId = await encryptedTopic.create({
    participants: [kyberPublicKey, otherKyberPublicKey],
    algorithm: EncryptionAlgorithms.Kyber512,
    storageOptions: {
      storeParticipants: false,
      configuration: StorageOptions.Message
    },
    metadata: {
      name: "Supply Chain Logistics"
    }
  });
  
  console.log('Topic created. Topic ID: ', topicId);

  // Submit a message to the encrypted topic
  const messageSequenceNumber = await encryptedTopic.submitMessage('Hey there!', StorageOptions.Message);

  // Get a message from the encrypted topic
  const message = await encryptedTopic.getMessage(messageSequenceNumber);
  
  // Calculate the total cost of the flow
  const totalCost = hederaStubCostCalculator.getTotalCost();
  
  console.log(totalCost); // Cost in USD of the operations performed above
```

Furthermore, you can run `npm run test:cost` from the root folder of this repository to get the latest delta between the estimated cost and the real one, given the current exchange rate of the Hedera Network. Please consult the testing chapter to learn more about the test suites.

## Testing

The SDK testing strategy includes unit tests and flow tests.

You can run both suites at once by running `npm run test:all` from the root folder of this repository.

> [!NOTE]
> To run the tests you will have to provide your own Hedera account id + Hedera private key. Duplicate the [.env.template](./tests/.env.template) file, rename it to `.env` and replace the values found there.

### Unit testing

Unit testing is used to verify the main functionality of the SDK. Unit tests cover mostly cryptographic modules (`Kyber` and `RSA`) and the project's index file (`index.ts`).

To run these tests, run `npm run test:unit` from the root folder of this repository.

### Flow testing

Flows are specific business settings that mimic real-life usage of the SDK. One example would be two parties interacting through an encrypted topic, adding a third one, exchanging messages, etc.

Check the [flow testing README](./tests/flows/README.md) for more information on the main flows.

To run these tests, run `npm run test:flows` from the root folder of this repository.

### Cost calculator testing

Cost calculator testing  initialises an EncryptedTopic object with a CostCalculator, and one without. It then runs a standard flow with some operations, and calculates the costs given the current exchange rate in the Hedera Network, and the internal hardcoded values.

To run these tests, run `npm run test:cost` from the root folder of this repository.


## API Reference

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
    - `storeParticipants (boolean)`: Boolean that specifies whether to store the participants array in a separate topic or not.
  - `metadata (?any)`: Object containing topic metadata

**Usage**

```typescript
const topicId = await encryptedTopic.create({
  participants: [kyberPublicKey],
  algorithm: EncryptionAlgorithms.Kyber512,
  storageOptions: {
    storeParticipants: false,
    configuration: StorageOptions.Message
  },
  metadata: {
    name: "Supply Chain Logistics"
  }
});
```

**Return value**

`topicId (string)`: id of the newly created topic.

---

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

### `migrateConfigurationStorageMedium ()`

**Description**

Migrate the topic's configuration to the File Service. This method is useful when requirements change and the topic needs to grow beyond its original design. For example, adding more participants to a topic that was created using the Consensus Service as the storage medium for the configuration.

**Usage**

```typescript
await encryptedTopic.migrateConfigurationStorageMedium();
```

---

### `rotateEncryptionKey ()`

**Description**

Rotate the topic encryption key. This method requires the storage of the topic participants to work.

**Usage**

```typescript
await encryptedTopic.rotateEncryptionKey();
```

---

### `storeParticipants (oldParticipantsPublicKeys)`

**Description**

Start storing the topic participants in a separate topic, to allow the main topic's encryption key to be rotated in the future. New participants will automatically be added to the participants topic.

Due to the way the SDK stores information, the old participants' public keys need to be passed as an argument to have a starting point. Failing to pass all the keys will lock some participants from future participation in the topic.

This can be very disruptive, so be extremely careful when calling this function!

**Usage**

```typescript
await encryptedTopic.storeParticipants([kyberPublicKey]);
```

---

### `submitMessage (message, medium)`

**Description**

Submit a message on an encrypted topic. The participant must have access to the topic in order to submit messages.

**Parameters**

- `message (string)`: String containing the message contents. If you want to transact a JSON payload, make sure to `JSON.stringify()` it first.
- `medium (StorageOptions)`: Enum specifying where the message will be stored, either as a file using the File Service or the Consensus Service. Available options are `StorageOptions.File` and `StorageOptions.Message`.

**Usage**

```typescript
const messageSequenceNumber = await encryptedTopic.submitMessage('Hey there!', StorageOptions.Message);
```

**Return value**

`messageSequenceNumber (number)`: sequence number of the message in the topic.

or

`ERROR`: if the user doesn't have access to the topic or the message exceeds the maximum allowed size for a Consensus Service message.

---
