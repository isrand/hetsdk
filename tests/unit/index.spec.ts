import {EncryptedTopic} from "../../src/index";
import fs from "fs";
import path from "path";
import {MockHederaStub} from "./mock/MockHederaStub";
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

describe("The EncryptedTopic class", () => {
    describe("constructor", () => {
        test("should return a valid object when no external HederaStub is provided, hence creating its own", () => {
            expect(new EncryptedTopic({
                hederaAccountId: hederaAccountId,
                privateKey: '',
                hederaPrivateKey: hederaPrivateKey
            })).toBeDefined();
        });

        test("should return a valid object when an external HederaStub is provided", () => {
            const mockHederaStub = new MockHederaStub();
            expect(new EncryptedTopic({
                hederaAccountId: hederaAccountId,
                privateKey: '',
                hederaPrivateKey: hederaPrivateKey
            }, mockHederaStub)).toBeDefined();
        });
    });

    describe("generateKeyPair function", () => {
        test("should return a valid set of keys given an encryption algorithm", () => {
            const keyPair512 = EncryptedTopic.generateKeyPair(EncryptionAlgorithms.Kyber512);
            expect(keyPair512).toBeDefined();
            expect(keyPair512.publicKey).toBeDefined();
            // base64-encoded Kyber keys are 1068, 1580 or 2092 characters in length
            expect(keyPair512.publicKey.length).toEqual((512*2) + 44);
            expect(keyPair512.privateKey).toBeDefined();

            const keyPair768 = EncryptedTopic.generateKeyPair(EncryptionAlgorithms.Kyber768);
            expect(keyPair768).toBeDefined();
            expect(keyPair768.publicKey).toBeDefined();
            // base64-encoded Kyber keys are 1068, 1580 or 2092 characters in length
            expect(keyPair768.publicKey.length).toEqual((768*2) + 44);
            expect(keyPair768.privateKey).toBeDefined();

            const keyPair1024 = EncryptedTopic.generateKeyPair(EncryptionAlgorithms.Kyber1024);
            expect(keyPair1024).toBeDefined();
            expect(keyPair1024.publicKey).toBeDefined();
            // base64-encoded Kyber keys are 1068, 1580 or 2092 characters in length
            expect(keyPair1024.publicKey.length).toEqual((1024*2) + 44);
            expect(keyPair1024.privateKey).toBeDefined();

            const keyPair2048 = EncryptedTopic.generateKeyPair(EncryptionAlgorithms.RSA2048);
            expect(keyPair2048).toBeDefined();
            expect(keyPair2048.publicKey).toBeDefined();
            // base64-encoded Kyber keys are 1068, 1580 or 2092 characters in length
            expect(keyPair2048.publicKey.length).toEqual(604);
            expect(keyPair2048.privateKey).toBeDefined();
        });
    });

    describe("create function", () => {
        describe("when specifying the configuration storage medium as 'Message'", () => {
            test("should create a new topic and return its Id", async () => {
                const mockHederaStub = new MockHederaStub();
                const userOne = EncryptedTopic.generateKeyPair(EncryptionAlgorithms.Kyber512);
                const encryptedTopic = new EncryptedTopic({
                    hederaAccountId: hederaAccountId,
                    privateKey: '',
                    hederaPrivateKey: hederaPrivateKey
                }, mockHederaStub);

                const topicId = await encryptedTopic.create({
                    algorithm: EncryptionAlgorithms.Kyber512,
                    participants: [userOne.publicKey],
                    storageOptions: {
                        configuration: StorageOptions.Message,
                        messages: StorageOptions.Message,
                        storeParticipants: false
                    }
                });

                await expect(topicId).toBeDefined();
            });
        });

        describe("when specifying the configuration storage medium as 'File'", () => {
            test("should create a new topic and return its Id", async () => {
                const mockHederaStub = new MockHederaStub();
                const userOne = EncryptedTopic.generateKeyPair(EncryptionAlgorithms.Kyber512);
                const encryptedTopic = new EncryptedTopic({
                    hederaAccountId: hederaAccountId,
                    privateKey: '',
                    hederaPrivateKey: hederaPrivateKey
                }, mockHederaStub);

                const topicId = await encryptedTopic.create({
                    algorithm: EncryptionAlgorithms.Kyber512,
                    participants: [userOne.publicKey],
                    storageOptions: {
                        configuration: StorageOptions.File,
                        messages: StorageOptions.Message,
                        storeParticipants: false
                    }
                });

                await expect(topicId).toBeDefined();
            });
        });

        describe("when specifying the messages storage medium as 'Message'", () => {
            test("should create a new topic and return its Id", async () => {
                const mockHederaStub = new MockHederaStub();
                const userOne = EncryptedTopic.generateKeyPair(EncryptionAlgorithms.Kyber512);
                const encryptedTopic = new EncryptedTopic({
                    hederaAccountId: hederaAccountId,
                    privateKey: '',
                    hederaPrivateKey: hederaPrivateKey
                }, mockHederaStub);

                const topicId = await encryptedTopic.create({
                    algorithm: EncryptionAlgorithms.Kyber512,
                    participants: [userOne.publicKey],
                    storageOptions: {
                        configuration: StorageOptions.Message,
                        messages: StorageOptions.Message,
                        storeParticipants: false
                    }
                });

                await expect(topicId).toBeDefined();
            });
        });

        describe("when specifying the messages storage medium as 'File'", () => {
            test("should create a new topic and return its Id", async () => {
                const mockHederaStub = new MockHederaStub();
                const userOne = EncryptedTopic.generateKeyPair(EncryptionAlgorithms.Kyber512);
                const encryptedTopic = new EncryptedTopic({
                    hederaAccountId: hederaAccountId,
                    privateKey: userOne.privateKey,
                    hederaPrivateKey: hederaPrivateKey
                }, mockHederaStub);

                const topicId = await encryptedTopic.create({
                    algorithm: EncryptionAlgorithms.Kyber512,
                    participants: [userOne.publicKey],
                    storageOptions: {
                        configuration: StorageOptions.Message,
                        messages: StorageOptions.File,
                        storeParticipants: false
                    }
                });

                await expect(topicId).toBeDefined();
            });
        });

        describe("when specifying that the participants should be stored in a separate topic", () => {
            test("should create a new topic and return its Id", async () => {
                const mockHederaStub = new MockHederaStub();
                const userOne = EncryptedTopic.generateKeyPair(EncryptionAlgorithms.Kyber512);
                const encryptedTopic = new EncryptedTopic({
                    hederaAccountId: hederaAccountId,
                    privateKey: userOne.privateKey,
                    hederaPrivateKey: hederaPrivateKey
                }, mockHederaStub);

                const topicId = await encryptedTopic.create({
                    algorithm: EncryptionAlgorithms.Kyber512,
                    participants: [userOne.publicKey],
                    storageOptions: {
                        configuration: StorageOptions.Message,
                        messages: StorageOptions.Message,
                        storeParticipants: true
                    }
                });

                await expect(topicId).toBeDefined();
            });
        });

    });

    describe("addParticipant function", () => {
        describe("when the encrypted topic configuration storage medium is set to 'Message'", () => {
            test("should not a new participant", async () => {
            const mockHederaStub = new MockHederaStub();
            const userOne = EncryptedTopic.generateKeyPair(EncryptionAlgorithms.Kyber512);
            const encryptedTopic = new EncryptedTopic({
                hederaAccountId: hederaAccountId,
                privateKey: userOne.privateKey,
                hederaPrivateKey: hederaPrivateKey
            }, mockHederaStub);

            await encryptedTopic.create({
                algorithm: EncryptionAlgorithms.Kyber512,
                participants: [userOne.publicKey],
                storageOptions: {
                    configuration: StorageOptions.Message,
                    messages: StorageOptions.Message,
                    storeParticipants: false
                }
            });

            const userTwo = EncryptedTopic.generateKeyPair(EncryptionAlgorithms.Kyber512);

            const func = async () => {
                await encryptedTopic.addParticipant(userTwo.publicKey);
            }

            await expect(func).rejects.toThrowError('New participants can only be added to topics that use the File Service as storage medium for their configuration. Requested topic uses the Consensus Service.');
            });
        });

        describe("when the encrypted topic configuration storage medium is set to 'File'", () => {
            test("should add a new participant", async () => {
                const mockHederaStub = new MockHederaStub();
                const userOne = EncryptedTopic.generateKeyPair(EncryptionAlgorithms.Kyber512);
                const encryptedTopic = new EncryptedTopic({
                    hederaAccountId: hederaAccountId,
                    privateKey: userOne.privateKey,
                    hederaPrivateKey: hederaPrivateKey
                }, mockHederaStub);

                const topicId = await encryptedTopic.create({
                    algorithm: EncryptionAlgorithms.Kyber512,
                    participants: [userOne.publicKey],
                    storageOptions: {
                        configuration: StorageOptions.File,
                        messages: StorageOptions.Message,
                        storeParticipants: false
                    }
                });

                await expect(topicId).toBeDefined();

                const userTwo = EncryptedTopic.generateKeyPair(EncryptionAlgorithms.Kyber512);

                const additionSuccess = await encryptedTopic.addParticipant(userTwo.publicKey);
                expect(additionSuccess).toEqual(true);
            });
        });

        describe("when forward secrecy is requested", () => {
           describe("and the configuration storage medium is set to 'File'", () => {
               describe("but the topic creation step did not choose to store participants in a separate topic", () => {
                   test("should not add a new participant", async () => {
                       const mockHederaStub = new MockHederaStub();
                       const userOne = EncryptedTopic.generateKeyPair(EncryptionAlgorithms.Kyber512);
                       const encryptedTopic = new EncryptedTopic({
                           hederaAccountId: hederaAccountId,
                           privateKey: userOne.privateKey,
                           hederaPrivateKey: hederaPrivateKey
                       }, mockHederaStub);

                       const topicId = await encryptedTopic.create({
                           algorithm: EncryptionAlgorithms.Kyber512,
                           participants: [userOne.publicKey],
                           storageOptions: {
                               configuration: StorageOptions.File,
                               messages: StorageOptions.Message,
                               storeParticipants: false
                           }
                       });

                       await expect(topicId).toBeDefined();

                       const userTwo = EncryptedTopic.generateKeyPair(EncryptionAlgorithms.Kyber512);

                       const func = async () => {
                           await encryptedTopic.addParticipant(userTwo.publicKey, true);
                       }

                       await expect(func).rejects.toThrowError('Topic did not choose to store participants upon creation, topic encryption key rotation is not possible.');
                   });
               });

               describe("and the topic creation step chose to store participants in a separate topic", () => {
                   test("should add a new participant", async () => {
                       const mockHederaStub = new MockHederaStub();

                       const userOne = EncryptedTopic.generateKeyPair(EncryptionAlgorithms.Kyber512);
                       const encryptedTopic = new EncryptedTopic({
                           hederaAccountId: hederaAccountId,
                           privateKey: userOne.privateKey,
                           hederaPrivateKey: hederaPrivateKey
                       }, mockHederaStub);

                       await encryptedTopic.create({
                           algorithm: EncryptionAlgorithms.Kyber512,
                           participants: [userOne.publicKey],
                           storageOptions: {
                               configuration: StorageOptions.File,
                               messages: StorageOptions.Message,
                               storeParticipants: true
                           }
                       });

                       const userTwo = EncryptedTopic.generateKeyPair(EncryptionAlgorithms.Kyber512);

                       const additionSuccess = await encryptedTopic.addParticipant(userTwo.publicKey, true);

                       await expect(additionSuccess).toEqual(true);
                   });
               });
           });

           describe("but the configuration storage medium is set to 'Message", () => {
               test("should not add a new participant", async () => {
                   const mockHederaStub = new MockHederaStub();
                   const userOne = EncryptedTopic.generateKeyPair(EncryptionAlgorithms.Kyber512);
                   const encryptedTopic = new EncryptedTopic({
                       hederaAccountId: hederaAccountId,
                       privateKey: userOne.privateKey,
                       hederaPrivateKey: hederaPrivateKey
                   }, mockHederaStub);

                   const topicId = await encryptedTopic.create({
                       algorithm: EncryptionAlgorithms.Kyber512,
                       participants: [userOne.publicKey],
                       storageOptions: {
                           configuration: StorageOptions.Message,
                           messages: StorageOptions.Message,
                           storeParticipants: false
                       }
                   });

                   await expect(topicId).toBeDefined();

                   const userTwo = EncryptedTopic.generateKeyPair(EncryptionAlgorithms.Kyber512);

                   const func = async () => {
                       await encryptedTopic.addParticipant(userTwo.publicKey, true);
                   }

                   await expect(func).rejects.toThrowError('Topic encryption key rotation is only available in encrypted topics that use the File Service as storage medium for their configuration. Requested topic uses the Consensus Service.');
               });
           });
        });
    });
});
