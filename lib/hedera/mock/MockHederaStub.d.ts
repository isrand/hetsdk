import { IHederaStub } from '../interfaces/IHederaStub';
import { ITopicMemoObject } from '../interfaces/ITopicMemoObject';
import { TopicInfo } from '@hashgraph/sdk';
import { MockTopic } from './MockTopic';
import { MockFile } from './MockFile';
export declare class MockHederaStub implements IHederaStub {
    topics: Map<string, MockTopic>;
    files: Map<string, MockFile>;
    private readonly maxAppendTransactionSize;
    createFile(contents?: string): Promise<string>;
    appendToFile(fileId: string, contents: string): Promise<void>;
    getFileContents(fileId: string): Promise<string>;
    createTopic(submitKey: string, topicMemoObject?: ITopicMemoObject): Promise<string>;
    updateTopicMemo(topicMemoObject: ITopicMemoObject, topicId?: string): Promise<void>;
    submitMessageToTopic(submitKey: string, topicId?: string, contents?: string): Promise<number>;
    getMessageFromTopic(sequenceNumber: number, topicId?: string): Promise<string>;
    getTopicInfo(topicId?: string): Promise<TopicInfo>;
}
