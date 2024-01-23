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

    // Whoops, forgot one participant
    const participantsTopicId = await encryptedTopicUserOne.storeParticipants([
        userOneKyberPublicKey,
        userTwoKyberPublicKey
    ]);

    // Sleep for a bit to give the Hedera Network time to update the encrypted topic memo...
    await sleep(20);

    await encryptedTopicUserOne.rotateEncryptionKey();

    const encryptedTopicUserTwo = new EncryptedTopic({
        hederaAccountId: configuration.hederaAccountId,
        hederaPrivateKey: configuration.hederaPrivateKey,
        privateKey: userTwoKyberPrivateKey,
        topicId: topicId
    });

    const secondMessageSequenceNumber = await encryptedTopicUserOne.submitMessage(message, StorageOptions.Message);

    // First two users can see the message still...
    const secondMessageAsParticipantOne = await encryptedTopicUserOne.getMessage(secondMessageSequenceNumber);
    expect (secondMessageAsParticipantOne).toEqual(message);

    const secondMessageAsParticipantTwo = await encryptedTopicUserTwo.getMessage(secondMessageSequenceNumber);
    expect (secondMessageAsParticipantTwo).toEqual(message);

    // But since user three wasn't in the array of original topic participants when the "storeParticipants" function was called, they can't see the contents of the latest message
    const encryptedTopicUserThree = new EncryptedTopic({
       hederaAccountId: configuration.hederaAccountId,
       hederaPrivateKey: configuration.hederaPrivateKey,
       privateKey: userThreeKyberPrivateKey,
       topicId: topicId
    });

    const func = async () => {
        await encryptedTopicUserThree.getMessage(secondMessageSequenceNumber);
    }

    await expect(func).rejects.toThrowError('Error fetching topic encryption key and init vector. Does user have access?');
}, 2147483647);

async function sleep(timeInSeconds: number) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(2);
        }, timeInSeconds * 1000);
    });
}
