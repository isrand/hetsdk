import {ITopicMemoObject} from "./ITopicMemoObject";
import {TopicInfo} from "@hashgraph/sdk";

export interface IHederaStub {
    createTopic(submitKey: string, topicMemoObject?: ITopicMemoObject): Promise<string>;
    submitMessageToTopic(submitKey: string, topicId?: string, contents?: string, encoding?: string): Promise<number>;
    getMessageFromTopic(sequenceNumber: number, topicId?: string): Promise<string>;
    getTopicInfo(topicId?: string): Promise<TopicInfo>;
    createFile(contents?: string): Promise<string>;
    appendToFile(fileId: string, contents: string): Promise<void>;
    getFileContents(fileId: string): Promise<string>;
}
