import {EncryptedTopic} from "../../src";
import {MockHederaStub} from "../../src/hedera/mock/MockHederaStub";
import {EncryptionAlgorithms} from "../../src/crypto/enums/EncryptionAlgorithms";
import {StorageOptions} from "../../src/hedera/enums/StorageOptions";
import {ITopicMemoObject} from "../../src/hedera/interfaces/ITopicMemoObject";
import {EnvironmentConfigurationResolver} from "../utils/EnvironmentConfigurationResolver";
import {StringGenerator} from "./utils/StringGenerator";

const configuration = new EnvironmentConfigurationResolver(String(process.env.NODE_ENV)).resolve();

describe("The EncryptedTopic class", () => {

    describe("constructor", () => {
        test("should return a valid object when no external HederaStub is provided, hence creating its own", () => {
            expect(new EncryptedTopic({
                hederaAccountId: configuration.hederaAccountId,
                privateKey: '',
                hederaPrivateKey: configuration.hederaPrivateKey
            })).toBeDefined();
        });

        test("should return a valid object when an external HederaStub is provided", () => {
            const mockHederaStub = new MockHederaStub();
            expect(new EncryptedTopic({
                hederaAccountId: configuration.hederaAccountId,
                privateKey: '',
                hederaPrivateKey: configuration.hederaPrivateKey
            }, mockHederaStub)).toBeDefined();
        });
    });

    describe("generateKeyPair function", () => {
        test("should return a valid set of Kyber512 keys", () => {
            const keyPair512 = EncryptedTopic.generateKeyPair(EncryptionAlgorithms.Kyber512);
            expect(keyPair512).toBeDefined();
            expect(keyPair512.publicKey).toBeDefined();
            // base64-encoded Kyber512 public keys are 1068 characters in length
            expect(keyPair512.publicKey.length).toEqual((512 * 2) + 44);
            expect(keyPair512.privateKey).toBeDefined();
        });
        test("should return a valid set of Kyber768 keys", () => {
            const keyPair768 = EncryptedTopic.generateKeyPair(EncryptionAlgorithms.Kyber768);
            expect(keyPair768).toBeDefined();
            expect(keyPair768.publicKey).toBeDefined();
            // base64-encoded Kyber768 public keys are 1580 characters in length
            expect(keyPair768.publicKey.length).toEqual((768 * 2) + 44);
            expect(keyPair768.privateKey).toBeDefined();
        });
        test("should return a valid set of Kyber1024 keys", () => {
            const keyPair1024 = EncryptedTopic.generateKeyPair(EncryptionAlgorithms.Kyber1024);
            expect(keyPair1024).toBeDefined();
            expect(keyPair1024.publicKey).toBeDefined();
            // base64-encoded Kyber1024 public keys are 2092 characters in length
            expect(keyPair1024.publicKey.length).toEqual((1024 * 2) + 44);
            expect(keyPair1024.privateKey).toBeDefined();
        });
        test("should return a valid set of RSA2048 keys", () => {
            const keyPair2048 = EncryptedTopic.generateKeyPair(EncryptionAlgorithms.RSA2048);
            expect(keyPair2048).toBeDefined();
            expect(keyPair2048.publicKey).toBeDefined();
            // base64-encoded RSA2048 public keys are 604 characters in length
            expect(keyPair2048.publicKey.length).toEqual(604);
            expect(keyPair2048.privateKey).toBeDefined();
        });
    });

    describe("create function", () => {
        describe("when specifying the configuration storage medium as 'Message'", () => {
            test("when adding too many participants, causing the topic configuration message to exceed Hedera's maximum allowed message size, should fail", async () => {
                const mockHederaStub = new MockHederaStub();
                const userOne = EncryptedTopic.generateKeyPair(EncryptionAlgorithms.Kyber512);
                const participants = [userOne.publicKey];
                for (let i = 0; i < 1000; i++) {
                    const user = EncryptedTopic.generateKeyPair(EncryptionAlgorithms.Kyber512);
                    participants.push(user.publicKey);
                }

                const encryptedTopic = new EncryptedTopic({
                    hederaAccountId: configuration.hederaAccountId,
                    privateKey: '',
                    hederaPrivateKey: configuration.hederaPrivateKey
                }, mockHederaStub);

                const func = async () => {
                    await encryptedTopic.create({
                        algorithm: EncryptionAlgorithms.Kyber512,
                        participants: participants,
                        storageOptions: {
                            configuration: StorageOptions.Message,
                            storeParticipants: false
                        }
                    });
                }

                await expect(func).rejects.toThrowError('Topic configuration object exceeds maximum message size allowed for Consensus Service. Please use the File Service instead.');
            });
            test("should create a new topic using Kyber512 and return its Id", async () => {
                const mockHederaStub = new MockHederaStub();
                const userOne = EncryptedTopic.generateKeyPair(EncryptionAlgorithms.Kyber512);
                const encryptedTopic = new EncryptedTopic({
                    hederaAccountId: configuration.hederaAccountId,
                    privateKey: '',
                    hederaPrivateKey: configuration.hederaPrivateKey
                }, mockHederaStub);

                const topicId = await encryptedTopic.create({
                    algorithm: EncryptionAlgorithms.Kyber512,
                    participants: [userOne.publicKey],
                    storageOptions: {
                        configuration: StorageOptions.Message,
                        storeParticipants: false
                    }
                });

                await expect(topicId).toBeDefined();
            });
            test("should create a new topic using Kyber768 and return its Id", async () => {
                const mockHederaStub = new MockHederaStub();
                const userOne = EncryptedTopic.generateKeyPair(EncryptionAlgorithms.Kyber768);
                const encryptedTopic = new EncryptedTopic({
                    hederaAccountId: configuration.hederaAccountId,
                    privateKey: '',
                    hederaPrivateKey: configuration.hederaPrivateKey
                }, mockHederaStub);

                const topicId = await encryptedTopic.create({
                    algorithm: EncryptionAlgorithms.Kyber768,
                    participants: [userOne.publicKey],
                    storageOptions: {
                        configuration: StorageOptions.Message,
                        storeParticipants: false
                    }
                });

                await expect(topicId).toBeDefined();
            });
            test("should create a new topic using Kyber1024 and return its Id", async () => {
                const mockHederaStub = new MockHederaStub();
                const userOne = EncryptedTopic.generateKeyPair(EncryptionAlgorithms.Kyber1024);
                const encryptedTopic = new EncryptedTopic({
                    hederaAccountId: configuration.hederaAccountId,
                    privateKey: '',
                    hederaPrivateKey: configuration.hederaPrivateKey
                }, mockHederaStub);

                const topicId = await encryptedTopic.create({
                    algorithm: EncryptionAlgorithms.Kyber1024,
                    participants: [userOne.publicKey],
                    storageOptions: {
                        configuration: StorageOptions.Message,
                        storeParticipants: false
                    }
                });

                await expect(topicId).toBeDefined();
            });
            test("should create a new topic using RSA2048 and return its Id", async () => {
                const mockHederaStub = new MockHederaStub();
                const userOne = EncryptedTopic.generateKeyPair(EncryptionAlgorithms.RSA2048);
                const encryptedTopic = new EncryptedTopic({
                    hederaAccountId: configuration.hederaAccountId,
                    privateKey: '',
                    hederaPrivateKey: configuration.hederaPrivateKey
                }, mockHederaStub);

                const topicId = await encryptedTopic.create({
                    algorithm: EncryptionAlgorithms.RSA2048,
                    participants: [userOne.publicKey],
                    storageOptions: {
                        configuration: StorageOptions.Message,
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
                    hederaAccountId: configuration.hederaAccountId,
                    privateKey: '',
                    hederaPrivateKey: configuration.hederaPrivateKey
                }, mockHederaStub);

                const topicId = await encryptedTopic.create({
                    algorithm: EncryptionAlgorithms.Kyber512,
                    participants: [userOne.publicKey],
                    storageOptions: {
                        configuration: StorageOptions.File,
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
                    hederaAccountId: configuration.hederaAccountId,
                    privateKey: userOne.privateKey,
                    hederaPrivateKey: configuration.hederaPrivateKey
                }, mockHederaStub);

                const topicId = await encryptedTopic.create({
                    algorithm: EncryptionAlgorithms.Kyber512,
                    participants: [userOne.publicKey],
                    storageOptions: {
                        configuration: StorageOptions.Message,
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
                    hederaAccountId: configuration.hederaAccountId,
                    privateKey: userOne.privateKey,
                    hederaPrivateKey: configuration.hederaPrivateKey
                }, mockHederaStub);

                await encryptedTopic.create({
                    algorithm: EncryptionAlgorithms.Kyber512,
                    participants: [userOne.publicKey],
                    storageOptions: {
                        configuration: StorageOptions.Message,
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
                    hederaAccountId: configuration.hederaAccountId,
                    privateKey: userOne.privateKey,
                    hederaPrivateKey: configuration.hederaPrivateKey
                }, mockHederaStub);

                const topicId = await encryptedTopic.create({
                    algorithm: EncryptionAlgorithms.Kyber512,
                    participants: [userOne.publicKey],
                    storageOptions: {
                        configuration: StorageOptions.File,
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
                            hederaAccountId: configuration.hederaAccountId,
                            privateKey: userOne.privateKey,
                            hederaPrivateKey: configuration.hederaPrivateKey
                        }, mockHederaStub);

                        const topicId = await encryptedTopic.create({
                            algorithm: EncryptionAlgorithms.Kyber512,
                            participants: [userOne.publicKey],
                            storageOptions: {
                                configuration: StorageOptions.File,
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
                            hederaAccountId: configuration.hederaAccountId,
                            privateKey: userOne.privateKey,
                            hederaPrivateKey: configuration.hederaPrivateKey
                        }, mockHederaStub);

                        await encryptedTopic.create({
                            algorithm: EncryptionAlgorithms.Kyber512,
                            participants: [userOne.publicKey],
                            storageOptions: {
                                configuration: StorageOptions.File,
                                storeParticipants: true
                            }
                        });

                        const userTwo = EncryptedTopic.generateKeyPair(EncryptionAlgorithms.Kyber512);

                        const additionSuccess = await encryptedTopic.addParticipant(userTwo.publicKey, true);

                        await expect(additionSuccess).toEqual(true);
                    });
                });
            });

            describe("but the configuration storage medium is set to 'Message'", () => {
                test("should not add a new participant", async () => {
                    const mockHederaStub = new MockHederaStub();
                    const userOne = EncryptedTopic.generateKeyPair(EncryptionAlgorithms.Kyber512);
                    const encryptedTopic = new EncryptedTopic({
                        hederaAccountId: configuration.hederaAccountId,
                        privateKey: userOne.privateKey,
                        hederaPrivateKey: configuration.hederaPrivateKey
                    }, mockHederaStub);

                    const topicId = await encryptedTopic.create({
                        algorithm: EncryptionAlgorithms.Kyber512,
                        participants: [userOne.publicKey],
                        storageOptions: {
                            configuration: StorageOptions.Message,
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

    describe("getParticipants function", () => {
        describe("when the encrypted topic admin chose to not store participants on topic creation", () => {
            test("should fail when trying to get the topic participants", async () => {
                const mockHederaStub = new MockHederaStub();
                const userOne = EncryptedTopic.generateKeyPair(EncryptionAlgorithms.Kyber512);
                const encryptedTopic = new EncryptedTopic({
                    hederaAccountId: configuration.hederaAccountId,
                    privateKey: userOne.privateKey,
                    hederaPrivateKey: configuration.hederaPrivateKey
                }, mockHederaStub);

                const topicId = await encryptedTopic.create({
                    algorithm: EncryptionAlgorithms.Kyber512,
                    participants: [userOne.publicKey],
                    storageOptions: {
                        configuration: StorageOptions.Message,
                        storeParticipants: false
                    }
                });

                const func = async () => {
                    await encryptedTopic.getParticipants();
                }

                await expect(func).rejects.toThrowError('Topic did not choose to store participants upon creation, cannot fetch list of participants.');
            });
        });

        describe("when the encrypted topic admin chose to store participants on topic creation", () => {
            test("should return the topic participants", async () => {
                const mockHederaStub = new MockHederaStub();
                const userOne = EncryptedTopic.generateKeyPair(EncryptionAlgorithms.Kyber512);
                const encryptedTopic = new EncryptedTopic({
                    hederaAccountId: configuration.hederaAccountId,
                    privateKey: userOne.privateKey,
                    hederaPrivateKey: configuration.hederaPrivateKey
                }, mockHederaStub);

                const topicId = await encryptedTopic.create({
                    algorithm: EncryptionAlgorithms.Kyber512,
                    participants: [userOne.publicKey],
                    storageOptions: {
                        configuration: StorageOptions.Message,
                        storeParticipants: true
                    }
                });

                const participants = await encryptedTopic.getParticipants();

                await expect(participants).toEqual([userOne.publicKey]);
            });
        });
    });

    describe("rotateEncryptionKey function", () => {
        describe("when the configuration storage medium is set to 'Message'", () => {
            test("should fail when trying to rotate the topic encryption key", async () => {
                const mockHederaStub = new MockHederaStub();
                const userOne = EncryptedTopic.generateKeyPair(EncryptionAlgorithms.Kyber512);
                const encryptedTopic = new EncryptedTopic({
                    hederaAccountId: configuration.hederaAccountId,
                    privateKey: userOne.privateKey,
                    hederaPrivateKey: configuration.hederaPrivateKey
                }, mockHederaStub);

                const topicId = await encryptedTopic.create({
                    algorithm: EncryptionAlgorithms.Kyber512,
                    participants: [userOne.publicKey],
                    storageOptions: {
                        configuration: StorageOptions.Message,
                        storeParticipants: false
                    }
                });

                await expect(topicId).toBeDefined();

                const func = async () => {
                    await encryptedTopic.rotateEncryptionKey();
                }

                await expect(func).rejects.toThrowError('Topic encryption key rotation is only available in encrypted topics that use the File Service as storage medium for their configuration. Requested topic uses the Consensus Service.');
            });
        });
        describe("when the encrypted topic admin chose to not store participants on topic creation", () => {
            test("should fail when trying to rotate the topic encryption key", async () => {
                const mockHederaStub = new MockHederaStub();
                const userOne = EncryptedTopic.generateKeyPair(EncryptionAlgorithms.Kyber512);
                const encryptedTopic = new EncryptedTopic({
                    hederaAccountId: configuration.hederaAccountId,
                    privateKey: userOne.privateKey,
                    hederaPrivateKey: configuration.hederaPrivateKey
                }, mockHederaStub);

                const topicId = await encryptedTopic.create({
                    algorithm: EncryptionAlgorithms.Kyber512,
                    participants: [userOne.publicKey],
                    storageOptions: {
                        configuration: StorageOptions.File,
                        storeParticipants: false
                    }
                });

                await expect(topicId).toBeDefined();

                const func = async () => {
                    await encryptedTopic.rotateEncryptionKey();
                }

                await expect(func).rejects.toThrowError('Topic did not choose to store participants upon creation, topic encryption key rotation is not possible.');
            });
        });
        describe("when the configuration storage medium is set to 'File'", () => {
            test("should rotate the topic encryption key", async () => {
                const mockHederaStub = new MockHederaStub();
                const userOne = EncryptedTopic.generateKeyPair(EncryptionAlgorithms.Kyber512);
                const encryptedTopic = new EncryptedTopic({
                    hederaAccountId: configuration.hederaAccountId,
                    privateKey: userOne.privateKey,
                    hederaPrivateKey: configuration.hederaPrivateKey
                }, mockHederaStub);

                const topicId = await encryptedTopic.create({
                    algorithm: EncryptionAlgorithms.Kyber512,
                    participants: [userOne.publicKey],
                    storageOptions: {
                        configuration: StorageOptions.File,
                        storeParticipants: true
                    }
                });

                await expect(topicId).toBeDefined();

                const topicInStub = mockHederaStub.topics.get(topicId);
                if (!topicInStub) {
                    fail('Topic not found in stub map.');
                }

                const topicConfigurationFileId: string = (JSON.parse(topicInStub.getMemo()) as ITopicMemoObject).s.c.i;

                let fileInStub = mockHederaStub.files.get(topicConfigurationFileId);
                if (!fileInStub) {
                    fail('Topic configuration file not found in stub map.');
                }

                const fileContentsLengthBeforeRotation = fileInStub.getContents().length;

                await encryptedTopic.rotateEncryptionKey();

                fileInStub = mockHederaStub.files.get(topicConfigurationFileId);
                if (!fileInStub) {
                    fail('Topic configuration file not found in stub map.');
                }

                const fileContentsLengthAfterRotation = fileInStub.getContents().length;

                const commaFound = fileInStub.getContents().indexOf(',') > -1;
                expect(commaFound).toEqual(true);

                // Rotating the encryption key essentially "duplicates" the old file contents with the new keys, and adds a comma
                // as separating character. Hence, we expect twice the original length plus one character.
                expect(fileContentsLengthAfterRotation).toEqual((fileContentsLengthBeforeRotation * 2) + 1);
            });
        });
    });

    describe("submitMessage function", () => {
        describe("when the message storage medium is set to 'File'", () => {
            test("should submit a new message on the topic with the file Id as contents and return its sequence number", async () => {
                const mockHederaStub = new MockHederaStub();
                const userOne = EncryptedTopic.generateKeyPair(EncryptionAlgorithms.Kyber512);
                const encryptedTopic = new EncryptedTopic({
                    hederaAccountId: configuration.hederaAccountId,
                    privateKey: userOne.privateKey,
                    hederaPrivateKey: configuration.hederaPrivateKey
                }, mockHederaStub);

                const topicId = await encryptedTopic.create({
                    algorithm: EncryptionAlgorithms.Kyber512,
                    participants: [userOne.publicKey],
                    storageOptions: {
                        configuration: StorageOptions.Message,
                        storeParticipants: false
                    }
                });

                const message = 'test';

                const sequenceNumber = await encryptedTopic.submitMessage(message, StorageOptions.File);
                await expect(sequenceNumber).toBeDefined();
                // sequence number is 2 because the first message is the topic configuration message...
                await expect(sequenceNumber).toEqual(2);
            });
        });

        describe("when the message storage medium is set to 'Message'", () => {
            test("should not submit a new message on the topic if the message size is greater than the maximum allowed by the Consensus Service", async () => {
                const mockHederaStub = new MockHederaStub();
                const userOne = EncryptedTopic.generateKeyPair(EncryptionAlgorithms.Kyber512);
                const encryptedTopic = new EncryptedTopic({
                    hederaAccountId: configuration.hederaAccountId,
                    privateKey: userOne.privateKey,
                    hederaPrivateKey: configuration.hederaPrivateKey
                }, mockHederaStub);

                await encryptedTopic.create({
                    algorithm: EncryptionAlgorithms.Kyber512,
                    participants: [userOne.publicKey],
                    storageOptions: {
                        configuration: StorageOptions.Message,
                        storeParticipants: false
                    }
                });

                const message = new StringGenerator((20 * 1024) + 1).generate();

                const func = async () => {
                    await encryptedTopic.submitMessage(message, StorageOptions.Message);
                }
                await expect(func).rejects.toThrowError('Final message after encryption exceeds maximum message size allowed for Consensus Service. Please use the File Service instead.');
            });
            test("should submit a new message on the topic", async () => {
                const mockHederaStub = new MockHederaStub();
                const userOne = EncryptedTopic.generateKeyPair(EncryptionAlgorithms.Kyber512);
                const encryptedTopic = new EncryptedTopic({
                    hederaAccountId: configuration.hederaAccountId,
                    privateKey: userOne.privateKey,
                    hederaPrivateKey: configuration.hederaPrivateKey
                }, mockHederaStub);

                await encryptedTopic.create({
                    algorithm: EncryptionAlgorithms.Kyber512,
                    participants: [userOne.publicKey],
                    storageOptions: {
                        configuration: StorageOptions.Message,
                        storeParticipants: false
                    }
                });

                const message = 'test';

                const sequenceNumber = await encryptedTopic.submitMessage(message, StorageOptions.Message);
                await expect(sequenceNumber).toBeDefined();
                // sequence number is 2 because the first message is the topic configuration message...
                await expect(sequenceNumber).toEqual(2);
            });
        });
    });

    describe("getMessage function", () => {
        describe("when the message storage medium is set to 'File'", () => {
            test("should get the message correctly", async () => {
                const mockHederaStub = new MockHederaStub();
                const userOne = EncryptedTopic.generateKeyPair(EncryptionAlgorithms.Kyber512);
                const encryptedTopic = new EncryptedTopic({
                    hederaAccountId: configuration.hederaAccountId,
                    privateKey: userOne.privateKey,
                    hederaPrivateKey: configuration.hederaPrivateKey
                }, mockHederaStub);
                const message = 'test';
                const topicId = await encryptedTopic.create({
                    algorithm: EncryptionAlgorithms.Kyber512,
                    participants: [userOne.publicKey],
                    storageOptions: {
                        configuration: StorageOptions.Message,
                        storeParticipants: false
                    }
                });

                const sequenceNumber = await encryptedTopic.submitMessage(message, StorageOptions.File);

                const messageFromTopic = await encryptedTopic.getMessage(sequenceNumber);
                await expect(message).toEqual(messageFromTopic);
            });

            test("should fail when getting a message with a sequence number greater than the one from the topic", async () => {
                const mockHederaStub = new MockHederaStub();
                const userOne = EncryptedTopic.generateKeyPair(EncryptionAlgorithms.Kyber512);
                const encryptedTopic = new EncryptedTopic({
                    hederaAccountId: configuration.hederaAccountId,
                    privateKey: userOne.privateKey,
                    hederaPrivateKey: configuration.hederaPrivateKey
                }, mockHederaStub);
                await encryptedTopic.create({
                    algorithm: EncryptionAlgorithms.Kyber512,
                    participants: [userOne.publicKey],
                    storageOptions: {
                        configuration: StorageOptions.Message,
                        storeParticipants: false
                    }
                });

                const func = async () => {
                    await encryptedTopic.getMessage(25);
                }
                await expect(func).rejects.toThrowError('Topic sequence number is less than the one provided.');
            });
        });

        describe("when the message storage medium is set to 'Message'", () => {
            test("should get the message correctly", async () => {
                const mockHederaStub = new MockHederaStub();
                const userOne = EncryptedTopic.generateKeyPair(EncryptionAlgorithms.Kyber512);
                const encryptedTopic = new EncryptedTopic({
                    hederaAccountId: configuration.hederaAccountId,
                    privateKey: userOne.privateKey,
                    hederaPrivateKey: configuration.hederaPrivateKey
                }, mockHederaStub);
                const message = 'test';
                await encryptedTopic.create({
                    algorithm: EncryptionAlgorithms.Kyber512,
                    participants: [userOne.publicKey],
                    storageOptions: {
                        configuration: StorageOptions.Message,
                        storeParticipants: false
                    }
                });

                const sequenceNumber = await encryptedTopic.submitMessage(message, StorageOptions.Message);
                const messageFromTopic = await encryptedTopic.getMessage(sequenceNumber);
                await expect(message).toEqual(messageFromTopic);
            });
        });
    });

    describe("migrateConfigurationStorageMedium function", () => {
        describe("given a topic with its configuration storage medium is set to 'File'", () => {
            test("should not allow a redundant migration to the File Service", async () => {
                const mockHederaStub = new MockHederaStub();
                const userOne = EncryptedTopic.generateKeyPair(EncryptionAlgorithms.Kyber512);
                const encryptedTopic = new EncryptedTopic({
                    hederaAccountId: configuration.hederaAccountId,
                    privateKey: userOne.privateKey,
                    hederaPrivateKey: configuration.hederaPrivateKey
                }, mockHederaStub);
                await encryptedTopic.create({
                    algorithm: EncryptionAlgorithms.Kyber512,
                    participants: [userOne.publicKey],
                    storageOptions: {
                        configuration: StorageOptions.File,
                        storeParticipants: false
                    }
                });

                const func = async () => {
                    await encryptedTopic.migrateConfigurationStorageMedium();
                };

                await expect(func).rejects.toThrowError('Cannot migrate configuration storage medium: topic already uses File Service as storage medium.');
            });
        });
        describe("given a topic with its configuration storage medium is set to 'Message'", () => {
            let topicId;
            const mockHederaStub = new MockHederaStub();
            const userOne = EncryptedTopic.generateKeyPair(EncryptionAlgorithms.Kyber512);
            const encryptedTopic = new EncryptedTopic({
                hederaAccountId: configuration.hederaAccountId,
                privateKey: userOne.privateKey,
                hederaPrivateKey: configuration.hederaPrivateKey
            }, mockHederaStub);
            const newParticipant = EncryptedTopic.generateKeyPair(EncryptionAlgorithms.Kyber512);

            test("should migrate this topic's configuration medium to 'File' correctly", async () => {
                topicId = await encryptedTopic.create({
                    algorithm: EncryptionAlgorithms.Kyber512,
                    participants: [userOne.publicKey],
                    storageOptions: {
                        configuration: StorageOptions.Message,
                        storeParticipants: false
                    }
                });
                await encryptedTopic.migrateConfigurationStorageMedium();
            });

            test("should allow to add a new participant after the migration", async () => {
                const additionSuccess = await encryptedTopic.addParticipant(newParticipant.publicKey);

                expect(additionSuccess).toEqual(true);
            });
        });
    });
});
