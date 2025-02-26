import {EncryptedTopic} from "../src";
import {EncryptionAlgorithms} from "../src/crypto/enums/EncryptionAlgorithms";
import {StorageOptions} from "../src/hedera/enums/StorageOptions";
import {EnvironmentConfigurationResolver} from "./utils/EnvironmentConfigurationResolver";

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

const encryptedTopicUserTwo = new EncryptedTopic({
    hederaAccountId: configuration.hederaAccountIdTwo,
    hederaPrivateKey: configuration.hederaPrivateKeyTwo,
    privateKey: userTwoKyberPrivateKey,
});

test("passes", async () => {
    const topicId = await encryptedTopicUserOne.create({
        participants: [userOneKyberPublicKey, userTwoKyberPublicKey],
        algorithm: EncryptionAlgorithms.Kyber512,
        storageOptions: {
            storeParticipants: false,
            configuration: StorageOptions.File
        },
        metadata: {
            name: "Supply Chain Logistics"
        },
    });

    const message = 'Hello there!';

    await encryptedTopicUserOne.submitMessage(message, StorageOptions.Message);

    const messageContents = await encryptedTopicUserTwo.getMessage(1);

    console.log(messageContents);

}, 2147483647);
