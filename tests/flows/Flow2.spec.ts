import {EncryptedTopic} from "../../src";
import {EncryptionAlgorithms} from "../../src/crypto/enums/EncryptionAlgorithms";
import {StorageOptions} from "../../src/hedera/enums/StorageOptions";
import {EnvironmentConfigurationResolver} from "../utils/EnvironmentConfigurationResolver";

const configuration = new EnvironmentConfigurationResolver(String(process.env.NODE_ENV)).resolve();

const userOne = EncryptedTopic.generateKeyPair(EncryptionAlgorithms.Kyber512);
const userOneKyberPublicKey = userOne.publicKey;
const userOneKyberPrivateKey = userOne.privateKey;

const userTwo = EncryptedTopic.generateKeyPair(EncryptionAlgorithms.Kyber512);
const userTwoKyberPublicKey = userTwo.publicKey;
const userTwoKyberPrivateKey = userTwo.privateKey;

const encryptedTopicUserOne = new EncryptedTopic({
    hederaAccountId: configuration.hederaAccountId,
    hederaPrivateKey: configuration.hederaPrivateKey,
    privateKey: userOneKyberPrivateKey,
});

const message = 'Hello there!';

test("passes", async () => {
    const topicId = await encryptedTopicUserOne.create({
        participants: [userOneKyberPublicKey, userTwoKyberPublicKey],
        algorithm: EncryptionAlgorithms.Kyber512,
        storageOptions: {
            storeParticipants: false,
            configuration: StorageOptions.File,
            messages: StorageOptions.Message
        },
        metadata: {
            name: "Supply Chain Logistics"
        },
    });

    await expect(topicId).toBeDefined();

    const encryptedTopicUserTwo = new EncryptedTopic({
        hederaAccountId: configuration.hederaAccountId,
        hederaPrivateKey: configuration.hederaPrivateKey,
        privateKey: userTwoKyberPrivateKey,
        topicId: topicId
    });

    // User one sends message
    const messageFromUserOneSequenceNumber = await encryptedTopicUserOne.submitMessage(message);

    const messageOneAsParticipantOne = await encryptedTopicUserOne.getMessage(messageFromUserOneSequenceNumber);
    expect(messageOneAsParticipantOne).toEqual(message);

    const messageOneAsParticipantTwo = await encryptedTopicUserTwo.getMessage(messageFromUserOneSequenceNumber);
    expect (messageOneAsParticipantTwo).toEqual(message);

    // User two sends message
    const messageFromUserTwoSequenceNumber = await encryptedTopicUserTwo.submitMessage(message);

    const messageTwoAsParticipantOne = await encryptedTopicUserOne.getMessage(messageFromUserTwoSequenceNumber);
    expect(messageTwoAsParticipantOne).toEqual(message);

    const messageTwoAsParticipantTwo = await encryptedTopicUserTwo.getMessage(messageFromUserTwoSequenceNumber);
    expect (messageTwoAsParticipantTwo).toEqual(message);
}, 2147483647);
