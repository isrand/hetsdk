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
            storeParticipants: true,
            configuration: StorageOptions.File
        },
        metadata: {
            name: "Supply Chain Logistics"
        },
    });

    await expect(topicId).toBeDefined();

    const firstMessageSequenceNumber = await encryptedTopicUserOne.submitMessage(message, StorageOptions.Message);

    const encryptedTopicUserTwo = new EncryptedTopic({
        hederaAccountId: configuration.hederaAccountId,
        hederaPrivateKey: configuration.hederaPrivateKey,
        privateKey: userTwoKyberPrivateKey,
        topicId: topicId
    });

    await encryptedTopicUserOne.rotateEncryptionKey();

    const firstMessageAsParticipantOne = await encryptedTopicUserOne.getMessage(firstMessageSequenceNumber);
    expect(firstMessageAsParticipantOne).toEqual(message);

    await encryptedTopicUserTwo.getMessage(firstMessageSequenceNumber);
    expect (firstMessageAsParticipantOne).toEqual(message);

    const secondMessageSequenceNumber = await encryptedTopicUserOne.submitMessage(message, StorageOptions.Message);

    const secondMessageAsParticipantOne = await encryptedTopicUserOne.getMessage(secondMessageSequenceNumber);
    expect(secondMessageAsParticipantOne).toEqual(message);

    const secondMessageFromUserThreeAsParticipantTwo = await encryptedTopicUserTwo.getMessage(secondMessageSequenceNumber);
    expect (secondMessageFromUserThreeAsParticipantTwo).toEqual(message);
}, 2147483647);
