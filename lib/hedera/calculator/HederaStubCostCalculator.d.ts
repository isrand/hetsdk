import { IHederaStub } from '../interfaces/IHederaStub';
import { ITopicMemoObject } from '../interfaces/ITopicMemoObject';
import { TopicInfo } from '@hashgraph/sdk';
export declare class HederaStubCostCalculator implements IHederaStub {
    private readonly mockHederaStub;
    private totalCost;
    constructor();
    createFile(contents?: string): Promise<string>;
    appendToFile(fileId: string, contents: string): Promise<void>;
    getFileContents(fileId: string): Promise<string>;
    createTopic(submitKey: string, topicMemoObject?: ITopicMemoObject): Promise<string>;
    updateTopicMemo(topicMemoObject: ITopicMemoObject, topicId?: string): Promise<void>;
    submitMessageToTopic(submitKey: string, topicId?: string, contents?: string): Promise<number>;
    getMessageFromTopic(sequenceNumber: number, topicId?: string): Promise<string>;
    getTopicInfo(topicId?: string): Promise<TopicInfo>;
    getTotalCost(): number;
}
