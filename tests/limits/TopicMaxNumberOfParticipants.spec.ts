import {EncryptedTopic} from "../../src";
import {EncryptionAlgorithms} from "../../src/crypto/enums/EncryptionAlgorithms";
import {StorageOptions} from "../../src/hedera/enums/StorageOptions";
import {EnvironmentConfigurationResolver} from "../utils/EnvironmentConfigurationResolver";

const configuration = new EnvironmentConfigurationResolver(String(process.env.NODE_ENV)).resolve();
const MAX_NUMBER_OF_PARTICIPANTS = 20;

const userOne = EncryptedTopic.generateKeyPair(EncryptionAlgorithms.Kyber512);
const userOneKyberPublicKey = userOne.publicKey;
const userOneKyberPrivateKey = userOne.privateKey;
const encryptedTopicUserOne = new EncryptedTopic({
    hederaAccountId: configuration.hederaAccountId,
    hederaPrivateKey: configuration.hederaPrivateKey,
    privateKey: userOneKyberPrivateKey,
});

const participantPublicKeys: string[] = [userOneKyberPublicKey];
const participantPrivateKeys: string[] = [userOneKyberPrivateKey];
for (let i = 0; i < MAX_NUMBER_OF_PARTICIPANTS - 1; i++) { // == encrypted topic admin + (MAX_NUMBER_OF_PARTICIPANTS - 1) others
    const participant = EncryptedTopic.generateKeyPair(EncryptionAlgorithms.Kyber512);
    participantPublicKeys.push(participant.publicKey);
    participantPrivateKeys.push(participant.privateKey);
}

let topicId = '';
let messageSequenceNumber = 0;
let messageContents = 'Hey there!';

describe("The Encrypted Topic", () => {
    describe("create function", () => {
        test(`should be able to create an encrypted topic with ${MAX_NUMBER_OF_PARTICIPANTS} participants`, async () => {
            topicId = await encryptedTopicUserOne.create({
                participants: participantPublicKeys,
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

            console.log(`Created encrypted topic with ${MAX_NUMBER_OF_PARTICIPANTS} participants`);

            messageSequenceNumber = await encryptedTopicUserOne.submitMessage(messageContents);
        }, 2147483647);

        test(`should allow all of its ${MAX_NUMBER_OF_PARTICIPANTS} participants to see the message sent`, async () => {

            for (const participantPrivateKey of participantPrivateKeys) {
                const message = await new EncryptedTopic({
                    hederaAccountId: configuration.hederaAccountId,
                    hederaPrivateKey: configuration.hederaPrivateKey,
                    privateKey: participantPrivateKey,
                    topicId: topicId
                }).getMessage(messageSequenceNumber);

                await expect(message).toEqual(messageContents);

                console.log(`Participant number ${participantPrivateKeys.indexOf(participantPrivateKey)} could get the message`);
            }

        }, 2147483647);
    });
});
