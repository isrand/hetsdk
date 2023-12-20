import { Client, TopicInfo } from "@hashgraph/sdk";
import { ITopicMemoObject } from "./interfaces/ITopicMemoObject";
import { IHederaStub } from "./interfaces/IHederaStub";
export declare class HederaStub implements IHederaStub {
    private readonly client;
    private readonly hederaPrivateKey;
    private readonly hederaAccountId;
    constructor(client: Client, hederaPrivateKey: string, hederaAccountId: string);
    createTopic(submitKey: string, topicMemoObject?: ITopicMemoObject): Promise<string>;
    submitMessageToTopic(submitKey: string, topicId: string, contents: string): Promise<number>;
    getMessageFromTopic(sequenceNumber: number, topicId?: string): Promise<string>;
    getTopicInfo(topicId?: string): Promise<TopicInfo>;
    createFile(contents?: string): Promise<string>;
    appendToFile(fileId: string, contents: string): Promise<void>;
    getFileContents(fileId: string): Promise<string>;
}
