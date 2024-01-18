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
        participants: [userOneKyberPublicKey],
        algorithm: EncryptionAlgorithms.Kyber512,
        storageOptions: {
            storeParticipants: true,
            configuration: StorageOptions.Message
        },
        metadata: {
            name: "Supply Chain Logistics"
        },
    });

    await expect(topicId).toBeDefined();

    const firstMessageSequenceNumber = await encryptedTopicUserOne.submitMessage(message, StorageOptions.Message);

    await encryptedTopicUserOne.migrateConfigurationStorageMedium();
    await encryptedTopicUserOne.addParticipant(userTwoKyberPublicKey, false);

    const encryptedTopicUserTwo = new EncryptedTopic({
        hederaAccountId: configuration.hederaAccountId,
        hederaPrivateKey: configuration.hederaPrivateKey,
        privateKey: userTwoKyberPrivateKey,
        topicId: topicId
    });

    const firstMessageAsParticipantTwo = await encryptedTopicUserTwo.getMessage(firstMessageSequenceNumber);
    expect (firstMessageAsParticipantTwo).toEqual(message);
}, 2147483647);
