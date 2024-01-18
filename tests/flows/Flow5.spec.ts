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

const userThree = EncryptedTopic.generateKeyPair(EncryptionAlgorithms.Kyber512);
const userThreeKyberPublicKey = userThree.publicKey;
const userThreeKyberPrivateKey = userThree.privateKey;

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

    const messageSequenceNumber = await encryptedTopicUserOne.submitMessage(message, StorageOptions.Message);

    const encryptedTopicUserTwo = new EncryptedTopic({
        hederaAccountId: configuration.hederaAccountId,
        hederaPrivateKey: configuration.hederaPrivateKey,
        privateKey: userTwoKyberPrivateKey,
        topicId: topicId
    });

    const encryptedTopicUserThree = new EncryptedTopic({
        hederaAccountId: configuration.hederaAccountId,
        hederaPrivateKey: configuration.hederaPrivateKey,
        privateKey: userThreeKyberPrivateKey,
        topicId: topicId
    });

    const additionSuccess = await encryptedTopicUserOne.addParticipant(userThreeKyberPublicKey, true);
    expect(additionSuccess).toEqual(true);

    const func = async () => {
        await encryptedTopicUserThree.getMessage(messageSequenceNumber);
    }

    await expect(func).rejects.toThrowError('Error fetching topic encryption key and init vector. Does user have access?');
}, 2147483647);
