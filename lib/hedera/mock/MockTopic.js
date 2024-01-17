"use strict";
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockTopic = void 0;
const sdk_1 = require("@hashgraph/sdk");
const MockMessage_1 = require("./MockMessage");
class MockTopic {
    constructor(submitKey, memo) {
        // Topic sequence number starts at 1, so first message must be null
        this.messages = [new MockMessage_1.MockMessage('')];
        this.topicIdAsNumber = Math.floor(Math.random() * 500);
        this.topicId = `0.0.${this.topicIdAsNumber}`;
        this.submitKey = submitKey;
        this.memo = memo;
        this.topicInfo = sdk_1.TopicInfo._fromProtobuf({
            topicInfo: {
                memo: JSON.stringify(this.memo),
                sequenceNumber: 0,
                submitKey: null,
                runningHash: new Uint8Array([])
            },
            topicID: {
                shardNum: 0,
                realmNum: 0,
                topicNum: this.topicIdAsNumber
            }
        });
    }
    getSubmitKey() {
        return this.submitKey;
    }
    getId() {
        return this.topicId;
    }
    getMemo() {
        return this.topicInfo.topicMemo;
    }
    setMemo(topicMemo) {
        this.memo = topicMemo;
        this.topicInfo = sdk_1.TopicInfo._fromProtobuf({
            topicInfo: {
                memo: JSON.stringify(topicMemo),
                sequenceNumber: 0,
                submitKey: null,
                runningHash: new Uint8Array([])
            },
            topicID: {
                shardNum: 0,
                realmNum: 0,
                topicNum: this.topicIdAsNumber
            }
        });
    }
    getInfo() {
        return this.topicInfo;
    }
    getMessage(sequenceNumber) {
        if (sequenceNumber > this.messages.length - 1) {
            throw new Error('Sequence number requested is greater than topic has.');
        }
        const message = this.messages[sequenceNumber];
        return Buffer.from(message.contents).toString('base64');
    }
    submitMessage(contents) {
        const message = new MockMessage_1.MockMessage(contents);
        this.messages.push(message);
        this.topicInfo = sdk_1.TopicInfo._fromProtobuf({
            topicInfo: {
                memo: JSON.stringify(this.memo),
                sequenceNumber: this.messages.length - 1,
                submitKey: null,
                runningHash: new Uint8Array([])
            },
            topicID: {
                shardNum: 0,
                realmNum: 0,
                topicNum: this.topicIdAsNumber
            }
        });
        return this.messages.length - 1;
    }
}
exports.MockTopic = MockTopic;
//# sourceMappingURL=MockTopic.js.map