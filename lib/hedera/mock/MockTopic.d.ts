import { ITopicMemoObject } from '../interfaces/ITopicMemoObject';
import { TopicInfo } from '@hashgraph/sdk';
export declare class MockTopic {
    private readonly topicId;
    private readonly topicIdAsNumber;
    private readonly messages;
    private memo?;
    private readonly submitKey;
    private topicInfo;
    constructor(submitKey: string, memo?: ITopicMemoObject);
    getSubmitKey(): string;
    getId(): string;
    getMemo(): string;
    setMemo(topicMemo: ITopicMemoObject): void;
    getInfo(): TopicInfo;
    getMessage(sequenceNumber: number): string;
    submitMessage(contents: string): number;
}
