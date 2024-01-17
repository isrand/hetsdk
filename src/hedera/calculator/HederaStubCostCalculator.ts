import {IHederaStub} from '../interfaces/IHederaStub';
import {ITopicMemoObject} from '../interfaces/ITopicMemoObject';
import {TopicInfo} from '@hashgraph/sdk';
import {CostConstants} from './CostConstants';
import {MockHederaStub} from '../mock/MockHederaStub';

/*
 * The HederaStubCostCalculator is a class that allows the user to get a rough estimate of the costs they will incur when using the SDK.
 * It can be passed to the main class in its constructor as an IHederaStub-compliant class. This will effectively set the SDK in "dry-run"
 * mode, so to speak.
 */
export class HederaStubCostCalculator implements IHederaStub {
  private readonly mockHederaStub: MockHederaStub;
  private totalCost: number;

  public constructor() {
    this.mockHederaStub = new MockHederaStub();
    this.totalCost = 0;
  }

  public async createFile(contents?: string): Promise<string> {
    this.totalCost += CostConstants.FileCreate;

    return this.mockHederaStub.createFile(contents);
  }

  public async appendToFile(fileId: string, contents: string): Promise<void> {
    this.totalCost += CostConstants.FileAppendPerCharacter * contents.length;

    return this.mockHederaStub.appendToFile(fileId, contents);
  }

  public async getFileContents(fileId: string): Promise<string> {
    this.totalCost += CostConstants.FileGetContents;

    return this.mockHederaStub.getFileContents(fileId);
  }

  public async createTopic(submitKey: string, topicMemoObject?: ITopicMemoObject): Promise<string> {
    this.totalCost += CostConstants.ConsensusCreateTopic;

    return this.mockHederaStub.createTopic(submitKey, topicMemoObject);
  }

  public async updateTopicMemo(topicMemoObject: ITopicMemoObject, topicId?: string): Promise<void> {
    this.totalCost += CostConstants.ConsensusUpdateTopic;

    return this.mockHederaStub.updateTopicMemo(topicMemoObject, topicId);
  }

  public async submitMessageToTopic(submitKey: string, topicId?: string, contents?: string): Promise<number> {
    if (contents) {
      this.totalCost += CostConstants.ConsensusSubmitMessagePerCharacter * contents.length;
    }

    return this.mockHederaStub.submitMessageToTopic(submitKey, topicId, contents);
  }

  public async getMessageFromTopic(sequenceNumber: number, topicId?: string): Promise<string> {
    this.totalCost += CostConstants.ConsensusGetMessage;

    return this.mockHederaStub.getMessageFromTopic(sequenceNumber, topicId);
  }

  public async getTopicInfo(topicId?: string): Promise<TopicInfo> {
    this.totalCost += CostConstants.ConsensusGetTopicInfo;

    return this.mockHederaStub.getTopicInfo(topicId);
  }

  public getTotalCost(): number {
    return this.totalCost;
  }
}
