import {MockTopic} from "./MockTopic";
import {ITopicMemoObject} from "../../../lib/hedera/interfaces/ITopicMemoObject";

describe("The MockTopic", () => {
    describe("constructor", () => {
        test("should return a valid MockTopic object", () => {
            const mockTopic = new MockTopic('submitKey');

            expect(mockTopic).toBeDefined();
            expect(mockTopic.getId()).toBeDefined();
        });
    });

    describe("getMessages function", () => {
        test("should return an empty array on topic creation", () => {
            const mockTopic = new MockTopic('submitKey');

            expect(mockTopic.getMessages()).toEqual(['']);
        });

        test("should return the correct messages once they are part of the topic", () => {
            const mockTopic = new MockTopic('submitKey');
            const messages = ['a', 'b', 'c'];

            for (const message of messages) {
                mockTopic.submitMessage(message);
            }

            expect(mockTopic.getMessages()).toEqual(['', ...messages]);
        });
    });

    describe("getMessage function", () => {
        test("should error when the requested sequence number is greater than the topic's", () => {
            const mockTopic = new MockTopic('submitKey');
            const func = () => {
                mockTopic.getMessage(1);
            }

            expect(func).toThrowError('Sequence number requested is greater than topic has.');
        });

        test("should return the correct message if it's found in the topic", () => {
            const mockTopic = new MockTopic('submitKey');
            const message = 'a';
            mockTopic.submitMessage(message);

            expect(mockTopic.getMessage(1)).toEqual(message);
        });
    });

    describe("submitMessage function", () => {
        test("should add a message to the topic", () => {
            const mockTopic = new MockTopic('submitKey');
            const message = 'a';
            mockTopic.submitMessage(message);

            expect(mockTopic.getMessage(1)).toEqual(message);
        });
    });

    describe("getSubmitKey function", () => {
        test("should return the topic submit key", () => {
            const mockTopic = new MockTopic('submitKey');
            const submitKey = mockTopic.getSubmitKey();

            expect(submitKey).toEqual('submitKey');
        });
    });

    describe("getMemo function", () => {
        test("should return the topic memo", () => {
            const topicMemo: ITopicMemoObject = {
                s: {
                    c: {
                        f: false
                    },
                    p: {
                        p: false
                    },
                    m: {
                        f: false
                    }
                }
            };
            const mockTopic = new MockTopic('submitKey', topicMemo);
            const memo = mockTopic.getMemo();

            expect(memo).toEqual(JSON.stringify(topicMemo));
        });
    });

    describe("getInfo function", () => {
        test("should return the topic info", () => {
            const mockTopic = new MockTopic('submitKey');
            const info = mockTopic.getInfo();

            expect(info).toBeDefined();
        });
    });

});
