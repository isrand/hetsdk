import { TopicMemoObject } from "./TopicMemoObject";
import { TopicInfo } from "@hashgraph/sdk";
export interface IHederaStub {
    createTopic(submitKey: string, topicMemoObject?: TopicMemoObject): Promise<string>;
    submitMessageToTopic(submitKey: string, topicId?: string, contents?: string): Promise<number>;
    getMessageFromTopic(topicId: string, sequenceNumber: number): Promise<string>;
    getTopicInfo(topicId: string): Promise<TopicInfo>;
    createFile(contents?: string): Promise<string>;
    appendToFile(fileId: string, contents: string): Promise<void>;
    getFileContents(fileId: string): Promise<string>;
}
