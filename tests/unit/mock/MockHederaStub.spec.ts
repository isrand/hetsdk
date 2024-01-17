import {MockHederaStub} from "./MockHederaStub";
import {ITopicMemoObject} from "../../../src/hedera/interfaces/ITopicMemoObject";
import {StringGenerator} from "../utils/StringGenerator";

describe("The MockHederaStub", () => {
    describe("constructor", () => {
        test("should return a valid MockHederaStub object", () => {
            const mockHederaStub = new MockHederaStub();

            expect(mockHederaStub).toBeDefined();
        });
    });

    describe("createFile function", () => {
        test("should create a valid file without contents in its internal map, and return its Id", async () => {
            const mockHederaStub = new MockHederaStub();
            const fileId = await mockHederaStub.createFile();

            expect(fileId).toBeDefined();
            expect(mockHederaStub.files.get(fileId)).toBeDefined();
            expect(mockHederaStub).toBeDefined();
        });

        test("should create a valid file with contents in its internal map, and return its Id", async () => {
            const contents = 'test'
            const mockHederaStub = new MockHederaStub();
            const fileId = await mockHederaStub.createFile(contents);

            expect(fileId).toBeDefined();
            expect(mockHederaStub.files.get(fileId)).toBeDefined();
            expect(mockHederaStub).toBeDefined();

            const fileInStub = mockHederaStub.files.get(fileId);
            if (!fileInStub) {
                fail('File not found in stub map.');
            }

            expect(fileInStub.getContents()).toEqual(contents);
        });
    });

    describe("appendToFile function", () => {
        test("should throw an error if the file does not exist", async () => {
            const fileId = 'does_not_exist';
            const mockHederaStub = new MockHederaStub();
            const func = async () => {
                await mockHederaStub.appendToFile(fileId, '');
            }

            await expect(func).rejects.toThrowError(`File with Id ${fileId} does not exist.`)
        });

        test("should append contents to a file, even when the contents go above the MAX_APPEND_TRANSACTION_SIZE", async () => {
            const fiveKiloBytes = 5000;
            const contents = new StringGenerator(fiveKiloBytes).generate();
            const mockHederaStub = new MockHederaStub();
            const fileId = await mockHederaStub.createFile();

            await mockHederaStub.appendToFile(fileId, contents);

            const fileInStub = mockHederaStub.files.get(fileId);
            if (!fileInStub) {
                fail('File not found in stub map.');
            }

            expect(fileInStub.getContents()).toEqual(contents);
        });

        test("should append contents to a file found in its internal map", async () => {
            const contents = 'test';
            const moreContents = 'one';
            const mockHederaStub = new MockHederaStub();
            const fileId = await mockHederaStub.createFile(contents);

            await mockHederaStub.appendToFile(fileId, moreContents);

            const fileInStub = mockHederaStub.files.get(fileId);
            if (!fileInStub) {
                fail('File not found in stub map.');
            }

            expect(fileInStub.getContents()).toEqual(contents + moreContents);
        });
    });

    describe("getFileContents function", () => {
        test("should throw an error if the file does not exist", async () => {
            const fileId = 'does_not_exist';
            const mockHederaStub = new MockHederaStub();
            const func = async () => {
                await mockHederaStub.getFileContents(fileId);
            }

            await expect(func).rejects.toThrowError(`File with Id ${fileId} does not exist.`);
        });

        test("should return the file contents correctly", async () => {
            const contents = 'test'
            const mockHederaStub = new MockHederaStub();
            const fileId = await mockHederaStub.createFile(contents);

            const fileContents = await mockHederaStub.getFileContents(fileId);

            await expect(contents).toEqual(fileContents);
        });
    });

    describe("createTopic function", () => {
        test("should create a valid topic in its internal map, and return its Id", async () => {
            const mockHederaStub = new MockHederaStub();
            const submitKey = 'submitKey';
            const topicMemo: ITopicMemoObject = {
                s: {
                    c: {
                        f: false,
                        i: ''
                    },
                    p: {
                        p: false,
                        i: ''
                    },
                    m: {
                        f: false,
                    }
                }
            };

            const topicId = await mockHederaStub.createTopic(submitKey, topicMemo);
            expect(topicId).toBeDefined();
            const topicInStub = mockHederaStub.topics.get(topicId);
            if (!topicInStub) {
                fail('Topic not found in stub map.');
            }

            expect(topicInStub).toBeDefined();
        });
    });

    describe("updateTopicMemo function", () => {
        test("should update a topic's memo correctly", async () => {
            const mockHederaStub = new MockHederaStub();
            const submitKey = 'submitKey';
            const topicMemo: ITopicMemoObject = {
                s: {
                    c: {
                        f: false,
                        i: ''
                    },
                    p: {
                        p: false,
                        i: ''
                    },
                    m: {
                        f: false,
                    }
                }
            };

            const topicId = await mockHederaStub.createTopic(submitKey, topicMemo);

            const newTopicMemo: ITopicMemoObject = {
                s: {
                    c: {
                        f: true,
                        i: '1234'
                    },
                    p: {
                        p: false,
                        i: ''
                    },
                    m: {
                        f: false,
                    }
                }
            }

            await mockHederaStub.updateTopicMemo(newTopicMemo, topicId);

            const topicInStub = mockHederaStub.topics.get(topicId);
            if (!topicInStub) {
                fail('Topic not found in stub map.');
            }

            expect(topicInStub.getMemo()).toEqual(JSON.stringify(newTopicMemo));
        });
    });

    describe("submitMessageToTopic function", () => {
        test("should throw an error if the topic does not exist", async () => {
            const topicId = 'does_not_exist';
            const submitKey = 'submitKey';
            const mockHederaStub = new MockHederaStub();
            const func = async () => {
                await mockHederaStub.submitMessageToTopic(submitKey, topicId, 'contents');
            }

            await expect(func).rejects.toThrowError(`Topic with Id ${topicId} does not exist.`);
        });

        test("should throw an error if the wrong submit key is used", async () => {
            const mockHederaStub = new MockHederaStub();
            const submitKey = 'submitKey';
            const topicId = await mockHederaStub.createTopic(submitKey);

            const wrongSubmitKey = 'submitKe'
            const func = async () => {
                await mockHederaStub.submitMessageToTopic(wrongSubmitKey, topicId, 'contents');
            }

            await expect(func).rejects.toThrowError('Wrong submit key used to submit messages on topic.');
        });

        test("should submit a message correctly, and the message should be found in the topic object", async () => {
            const mockHederaStub = new MockHederaStub();
            const contents = 'test';
            const submitKey = 'submitKey';
            const topicId = await mockHederaStub.createTopic(submitKey);

            const sequenceNumber = await mockHederaStub.submitMessageToTopic(submitKey, topicId, contents);

            const topicInStub = mockHederaStub.topics.get(topicId);
            if (!topicInStub) {
                fail('Topic not found in stub map.');
            }

            expect(topicInStub.getMessage(sequenceNumber)).toEqual(Buffer.from(contents).toString('base64'));
        });

    });

    describe("getMessageFromTopic function", () => {
        test("should throw an error if the topic does not exist", async () => {
            const topicId = 'does_not_exist';
            const mockHederaStub = new MockHederaStub();
            const func = async () => {
                await mockHederaStub.getMessageFromTopic(1, topicId);
            }

            await expect(func).rejects.toThrowError(`Topic with Id ${topicId} does not exist.`);
        });

        test("should throw an error if the sequence number is greater than the one in the topic", async () => {
            const mockHederaStub = new MockHederaStub();
            const submitKey = 'submitKey';
            const topicId = await mockHederaStub.createTopic(submitKey);

            const func = async () => {
                await mockHederaStub.getMessageFromTopic(1, topicId);
            }

            await expect(func).rejects.toThrowError('Sequence number requested is greater than topic has.');
        });

        test("should return a message from the topic given its sequence number", async () => {
            const mockHederaStub = new MockHederaStub();
            const submitKey = 'submitKey';
            const topicId = await mockHederaStub.createTopic(submitKey);
            const contents = 'test';
            const sequenceNumber = await mockHederaStub.submitMessageToTopic(submitKey, topicId, contents);

            const message = await mockHederaStub.getMessageFromTopic(sequenceNumber, topicId);

            await expect(Buffer.from(contents).toString('base64')).toEqual(message);
        });
    });

    describe("getTopicInfo function", () => {
        test("should throw an error if the topic does not exist", async () => {
            const topicId = 'does_not_exist';
            const mockHederaStub = new MockHederaStub();
            const func = async () => {
                await mockHederaStub.getTopicInfo(topicId);
            }

            await expect(func).rejects.toThrowError(`Topic with Id ${topicId} does not exist.`);
        });

        test("should return the topic info ", async () => {
            const mockHederaStub = new MockHederaStub();
            const submitKey = 'submitKey';
            const topicId = await mockHederaStub.createTopic(submitKey);
            const topicInfo = await mockHederaStub.getTopicInfo(topicId);

            expect(topicInfo).toBeDefined();
        });
    });
});
