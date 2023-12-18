import { Client } from "@hashgraph/sdk";
import { TopicMemoObject } from "./interfaces/TopicMemoObject";
export declare class HederaStub {
    private readonly client;
    private readonly hederaPrivateKey;
    private readonly hederaAccountId;
    constructor(client: Client, hederaPrivateKey: string, hederaAccountId: string);
    createTopic(submitKey: string, topicMemoObject?: TopicMemoObject): Promise<string>;
    submitMessageToTopic(submitKey: string, topicId?: string, contents?: string): Promise<number>;
    createFile(contents?: string): Promise<string>;
    appendToFile(fileId: string, contents: string): Promise<void>;
    getFileContents(fileId: string): Promise<string>;
}
