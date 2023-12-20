import * as path from 'path';
import * as fs from 'fs';
import {EncryptedTopic} from "../../src";
import {EncryptionAlgorithms} from "../../src/crypto/enums/EncryptionAlgorithms";
import {StorageOptions} from "../../src/hedera/enums/StorageOptions";

if (String(process.env.NODE_ENV) !== 'CI') {
    if (!fs.existsSync(path.resolve(__dirname, '..', '.env'))) {
        throw new Error('.env file not found, please provide one (follow the .env.template file)');
    }

   require('dotenv').config(
       { path: path.resolve(__dirname, '..', '.env') }
   );
}

const hederaAccountId = String(process.env.HEDERA_ACCOUNT_ID);
const hederaPrivateKey = String(process.env.HEDERA_PRIVATE_KEY);

describe("The Encrypted Topic", () => {
    let topicId;
    const userOne = EncryptedTopic.generateKeyPair(EncryptionAlgorithms.Kyber512);
    const userOneKyberPublicKey = userOne.publicKey;
    const userOneKyberPrivateKey = userOne.privateKey;
    const encryptedTopicUserOne = new EncryptedTopic({
        hederaAccountId: hederaAccountId,
        hederaPrivateKey: hederaPrivateKey,
        privateKey: userOneKyberPrivateKey,
    });

    const messageOneContents = 'Hello there!';

    const userTwo = EncryptedTopic.generateKeyPair(EncryptionAlgorithms.Kyber512);
    const userTwoKyberPublicKey = userTwo.publicKey;
    const userTwoKyberPrivateKey = userTwo.privateKey;

    describe("create function", () => {
        test("should work and return an encrypted topic's Id", async () => {
            topicId = await encryptedTopicUserOne.create({
                participants: [userOneKyberPublicKey],
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
        }, 60000);
    });

    describe("submitMessage function", () => {
        test("should work and return a message's sequence number", async () => {
            const messageSequenceNumber = await encryptedTopicUserOne.submitMessage(messageOneContents);

            await expect(messageSequenceNumber).toBeDefined();
            await expect(messageSequenceNumber).toEqual(1);
        }, 60000);
    });

    describe("getMessage function", () => {
        test("should work and return a message", async () => {
            const message = await encryptedTopicUserOne.getMessage(1);

            await expect(message).toBeDefined();
            await expect(message).toEqual(messageOneContents);
        }, 60000);
    });

    describe("addParticipant function", () => {
        test("should add a participant correctly", async () => {
            const addition = await encryptedTopicUserOne.addParticipant(userTwoKyberPublicKey);

            await expect(addition).toBeDefined();
            await expect(addition).toEqual(true);
        }, 60000);
    });
});
