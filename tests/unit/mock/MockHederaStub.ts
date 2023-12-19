import {IHederaStub} from "../../../src/hedera/interfaces/IHederaStub";
import {ITopicMemoObject} from "../../../src/hedera/interfaces/ITopicMemoObject";
import {TopicInfo} from "@hashgraph/sdk";
import {MockTopic} from "./MockTopic";
import {MockFile} from "./MockFile";

export class MockHederaStub implements IHederaStub {
    public topics: Map<string, MockTopic>;
    public files: Map<string, MockFile>;

    public constructor() {
        this.topics = new Map();
        this.files = new Map();
    }

    public async createFile(contents?: string): Promise<string> {
        const file = new MockFile(contents);
        const fileId = file.getId();

        this.files.set(fileId, file);

        return fileId;
    }

    public async appendToFile(fileId: string, contents: string): Promise<void> {
        const file = this.files.get(fileId);
        if (!file) {
            throw new Error(`File with Id ${fileId} does not exist.`);
        }

        file.append(contents);

        return;
    }

    public async getFileContents(fileId: string): Promise<string> {
        const file = this.files.get(fileId);
        if (!file) {
            throw new Error(`File with Id ${fileId} does not exist.`);
        }

        return file.getContents();
    }

    public async createTopic(submitKey: string, topicMemoObject?: ITopicMemoObject): Promise<string> {
        const topic = new MockTopic(submitKey, topicMemoObject);
        const topicId = topic.getId();

        this.topics.set(topicId, topic);

        return topicId;
    }

    public async submitMessageToTopic(submitKey: string, topicId: string, contents: string): Promise<number> {
        const topic = this.topics.get(topicId);
        if (!topic) {
            throw new Error(`Topic with Id ${topicId} does not exist.`);
        }

        if (topic.getSubmitKey() !== submitKey) {
            throw new Error('Wrong submit key used to submit messages on topic.');
        }

        return topic.submitMessage(contents);
    }

    public async getMessageFromTopic(topicId: string, sequenceNumber: number): Promise<string> {
        const topic = this.topics.get(topicId);
        if (!topic) {
            throw new Error(`Topic with Id ${topicId} does not exist.`);
        }

        return topic.getMessage(sequenceNumber);
    }

    public async getTopicInfo(topicId: string): Promise<TopicInfo> {
        const topic = this.topics.get(topicId);
        if (!topic) {
            throw new Error(`Topic with Id ${topicId} does not exist.`);
        }

        return topic.getInfo();
    }
}
