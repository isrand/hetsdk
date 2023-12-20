import {
  Client,
  FileAppendTransaction,
  FileContentsQuery,
  FileCreateTransaction, Hbar,
  PrivateKey,
  TopicCreateTransaction,
  TopicInfo,
  TopicInfoQuery,
  TopicMessage,
  TopicMessageQuery,
  TopicMessageSubmitTransaction
} from '@hashgraph/sdk';
import {ITopicMemoObject} from './interfaces/ITopicMemoObject';
import {Long} from '@hashgraph/sdk/lib/long';
import {IHederaStub} from './interfaces/IHederaStub';

export class HederaStub implements IHederaStub {
  public constructor(
    private readonly client: Client,
    private readonly hederaPrivateKey: string,
    private readonly hederaAccountId: string
  ) {
  }

  public async createTopic(submitKey: string, topicMemoObject?: ITopicMemoObject): Promise<string> {
    const topicCreateTransaction: TopicCreateTransaction = new TopicCreateTransaction({
      adminKey: PrivateKey.fromString(this.hederaPrivateKey),
      autoRenewAccountId: this.hederaAccountId
    });

    topicCreateTransaction.setSubmitKey(PrivateKey.fromString(submitKey));

    if (topicMemoObject) {
      topicCreateTransaction.setTopicMemo(JSON.stringify(topicMemoObject));
    }

    topicCreateTransaction.freezeWith(this.client);
    await topicCreateTransaction.sign(PrivateKey.fromString(this.hederaPrivateKey));

    const encryptedTopicCreationResponse = await topicCreateTransaction.execute(this.client);
    const encryptedTopicCreationReceipt = await encryptedTopicCreationResponse.getReceipt(this.client);

    return encryptedTopicCreationReceipt.topicId?.toString() || '';
  }

  public async submitMessageToTopic(submitKey: string, topicId?: string, contents?: string): Promise<number> {
    const topicSubmitMessageTransaction: TopicMessageSubmitTransaction = new TopicMessageSubmitTransaction({
      topicId: topicId,
      message: contents
    });

    topicSubmitMessageTransaction.freezeWith(this.client);
    await topicSubmitMessageTransaction.sign(PrivateKey.fromString(submitKey));
    await topicSubmitMessageTransaction.sign(PrivateKey.fromString(this.hederaPrivateKey));

    const response = await topicSubmitMessageTransaction.execute(this.client);
    const receipt = await response.getReceipt(this.client);

    return Number(receipt.topicSequenceNumber as Long);
  }

  public async getMessageFromTopic(sequenceNumber: number, topicId?: string): Promise<string> {
    const topicMessageQuery = new TopicMessageQuery({
      topicId: topicId
    }).setStartTime(0);

    return new Promise((resolve) => {
      topicMessageQuery.subscribe(
        this.client,
        null,
        (topicMessage: TopicMessage) => {
          // Check if the original message was split among different chunks
          if (topicMessage.chunks.length > 0) {
            for (const chunk of topicMessage.chunks) {
              if (Number(chunk.sequenceNumber as Long) === Number(sequenceNumber)) {
                resolve(Buffer.from(topicMessage.contents).toString('base64'));
              }
            }
          }

          // Check if the original message is kept within just one message (no chunks)
          if (Number(topicMessage.sequenceNumber as Long) === Number(sequenceNumber)) {
            resolve(Buffer.from(topicMessage.contents).toString('base64'));
          }
        }
      );
    });
  }

  public async getTopicInfo(topicId?: string): Promise<TopicInfo> {
    const topicInfo = new TopicInfoQuery({
      topicId: topicId
    });

    return topicInfo.execute(this.client);
  }

  public async createFile(contents?: string): Promise<string> {
    const fileCreateTransaction: FileCreateTransaction = new FileCreateTransaction({
      keys: [PrivateKey.fromString(this.hederaPrivateKey).publicKey],
      contents: contents
    }).setMaxTransactionFee(new Hbar(5));

    fileCreateTransaction.freezeWith(this.client);
    await fileCreateTransaction.sign(PrivateKey.fromString(this.hederaPrivateKey));

    const fileCreateTransactionResponse = await fileCreateTransaction.execute(this.client);
    const fileCreateTransactionReceipt = await fileCreateTransactionResponse.getReceipt(this.client);

    return fileCreateTransactionReceipt.fileId?.toString() || '';
  }

  public async appendToFile(fileId: string, contents: string): Promise<void> {
    const fileAppendTransaction: FileAppendTransaction = new FileAppendTransaction({
      fileId: fileId,
      contents: contents
    }).setMaxTransactionFee(new Hbar(5));

    fileAppendTransaction.freezeWith(this.client);
    await fileAppendTransaction.sign(PrivateKey.fromString(this.hederaPrivateKey));

    await fileAppendTransaction.execute(this.client);
  }

  public async getFileContents(fileId: string): Promise<string> {
    const fileGetContentsQuery: FileContentsQuery = new FileContentsQuery({
      fileId: fileId
    });

    const fileContentsUint8Array: Uint8Array = await fileGetContentsQuery.execute(this.client);

    return fileContentsUint8Array.toString();
  }
}
