import { Client, TopicInfo } from "@hashgraph/sdk";
import { TopicMemoObject } from "./interfaces/TopicMemoObject";
import { IHederaStub } from "./interfaces/IHederaStub";
export declare class HederaStub implements IHederaStub {
    private readonly client;
    private readonly hederaPrivateKey;
    private readonly hederaAccountId;
    constructor(client: Client, hederaPrivateKey: string, hederaAccountId: string);
    createTopic(submitKey: string, topicMemoObject?: TopicMemoObject): Promise<string>;
    submitMessageToTopic(submitKey: string, topicId: string, contents: string): Promise<number>;
    getMessageFromTopic(topicId: string, sequenceNumber: number): Promise<string>;
    getTopicInfo(topicId: string): Promise<TopicInfo>;
    createFile(contents?: string): Promise<string>;
    appendToFile(fileId: string, contents: string): Promise<void>;
    getFileContents(fileId: string): Promise<string>;
}
