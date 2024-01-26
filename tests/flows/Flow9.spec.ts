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
        participants: [userOneKyberPublicKey, userTwoKyberPublicKey, userThreeKyberPublicKey],
        algorithm: EncryptionAlgorithms.Kyber512,
        storageOptions: {
            storeParticipants: false,
            configuration: StorageOptions.File
        },
        metadata: {
            name: "Supply Chain Logistics"
        }
    });

    const firstMessageSequenceNumber = await encryptedTopicUserOne.submitMessage(message, StorageOptions.Message);

    const participantsTopicId = await encryptedTopicUserOne.storeParticipants([
        userOneKyberPublicKey,
        userTwoKyberPublicKey,
        userThreeKyberPublicKey
    ]);

    // Sleep for a bit to give the Hedera Network time to update the encrypted topic memo...
    await sleep(5);

    await encryptedTopicUserOne.rotateEncryptionKey();

    // Passing without issues...
}, 2147483647);

async function sleep(timeInSeconds: number) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(2);
        }, timeInSeconds * 1000);
    });
}
