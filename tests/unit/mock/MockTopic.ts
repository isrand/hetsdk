import {ITopicMemoObject} from "../../../src/hedera/interfaces/ITopicMemoObject";
import {TopicInfo} from "@hashgraph/sdk";
import {Long} from "@hashgraph/sdk/lib/long";
import {MockMessage} from "./MockMessage";

export class MockTopic {
    private readonly topicId: string;
    private readonly topicIdAsNumber: number;
    private readonly messages: MockMessage[];
    private memo?: ITopicMemoObject;
    private readonly submitKey: string;
    private topicInfo!: TopicInfo;

    public constructor(
        submitKey: string,
        memo?: ITopicMemoObject) {
        // Topic sequence number starts at 1, so first message must be null
        this.messages = [new MockMessage('')];
        this.topicIdAsNumber = Math.floor(Math.random() * 500);
        this.topicId = `0.0.${this.topicIdAsNumber}`;
        this.submitKey = submitKey;
        this.memo = memo;

        this.topicInfo = TopicInfo._fromProtobuf({
            topicInfo: {
                memo: JSON.stringify(this.memo),
                sequenceNumber: (0 as Long),
                submitKey: null,
                runningHash: new Uint8Array([])
            },
            topicID: {
                shardNum: 0 as Long,
                realmNum: 0 as Long,
                topicNum: this.topicIdAsNumber as Long
            }
        });
    }

    public getSubmitKey(): string {
        return this.submitKey;
    }

    public getId(): string {
        return this.topicId;
    }

    public getMemo(): string {
        return this.topicInfo.topicMemo;
    }

    public setMemo(topicMemo: ITopicMemoObject): void {
        this.memo = topicMemo;

        this.topicInfo = TopicInfo._fromProtobuf({
            topicInfo: {
                memo: JSON.stringify(topicMemo),
                sequenceNumber: (0 as Long),
                submitKey: null,
                runningHash: new Uint8Array([])
            },
            topicID: {
                shardNum: 0 as Long,
                realmNum: 0 as Long,
                topicNum: this.topicIdAsNumber as Long
            }
        });
    }

    public getInfo(): TopicInfo {
        return this.topicInfo;
    }

    public getMessage(sequenceNumber: number): string {
        if (sequenceNumber > this.messages.length - 1) {
            throw new Error('Sequence number requested is greater than topic has.');
        }

        const message = this.messages[sequenceNumber];

        return Buffer.from(message.contents).toString('base64');
    }

    public submitMessage(contents: string): number {
        const message = new MockMessage(contents);
        this.messages.push(message);

        this.topicInfo = TopicInfo._fromProtobuf({
            topicInfo: {
                memo: JSON.stringify(this.memo),
                sequenceNumber: (this.messages.length - 1 as Long),
                submitKey: null,
                runningHash: new Uint8Array([])
            },
            topicID: {
                shardNum: 0 as Long,
                realmNum: 0 as Long,
                topicNum: this.topicIdAsNumber as Long
            }
        });

        return this.messages.length - 1;
    }
}
