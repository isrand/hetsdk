import {MockTopic} from "./MockTopic";
import {ITopicMemoObject} from "../../../lib/hedera/interfaces/ITopicMemoObject";
import {MockMessage} from "./MockMessage";

describe("The MockTopic", () => {
    describe("constructor", () => {
        test("should return a valid MockTopic object", () => {
            const mockTopic = new MockTopic('submitKey');

            expect(mockTopic).toBeDefined();
            expect(mockTopic.getId()).toBeDefined();
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

            expect(mockTopic.getMessage(1)).toEqual(Buffer.from('a').toString('base64'));
        });
    });

    describe("submitMessage function", () => {
        test("should add a message to the topic", () => {
            const mockTopic = new MockTopic('submitKey');
            const message = 'a';
            mockTopic.submitMessage(message);

            expect(mockTopic.getMessage(1)).toEqual(Buffer.from('a').toString('base64'));
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
