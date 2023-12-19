import {
    Client,
    FileAppendTransaction,
    FileContentsQuery,
    FileCreateTransaction,
    PrivateKey,
    TopicCreateTransaction, TopicInfo, TopicInfoQuery, TopicMessage, TopicMessageQuery, TopicMessageSubmitTransaction
} from "@hashgraph/sdk";
import {TopicMemoObject} from "./interfaces/TopicMemoObject";
import {Long} from "@hashgraph/sdk/lib/long";
import {IHederaStub} from "./interfaces/IHederaStub";

export class HederaStub implements IHederaStub {
    public constructor(
        private readonly client: Client,
        private readonly hederaPrivateKey: string,
        private readonly hederaAccountId: string
    ) {
    }

    public async createTopic(submitKey: string, topicMemoObject?: TopicMemoObject): Promise<string> {
        const topicCreateTransaction: TopicCreateTransaction = new TopicCreateTransaction({
            adminKey: PrivateKey.fromString(this.hederaPrivateKey),
            autoRenewAccountId: this.hederaAccountId
        });

        topicCreateTransaction.setSubmitKey(PrivateKey.fromString(submitKey));

        if (topicMemoObject) {
            topicCreateTransaction.setTopicMemo(JSON.stringify(topicMemoObject));
        }

        await topicCreateTransaction.freezeWith(this.client);
        await topicCreateTransaction.sign(PrivateKey.fromString(this.hederaPrivateKey));

        const encryptedTopicCreationResponse = await topicCreateTransaction.execute(this.client);
        const encryptedTopicCreationReceipt = await encryptedTopicCreationResponse.getReceipt(this.client);

        if (!encryptedTopicCreationReceipt.topicId) {
            throw new Error('Topic Id not found in encrypted topic creation transaction receipt.');
        }

        return encryptedTopicCreationReceipt.topicId.toString();
    }

    public async submitMessageToTopic(submitKey: string, topicId: string, contents: string): Promise<number> {
        const topicSubmitMessageTransaction: TopicMessageSubmitTransaction = new TopicMessageSubmitTransaction({
            topicId: topicId,
            message: contents
        });

        await topicSubmitMessageTransaction.freezeWith(this.client);
        await topicSubmitMessageTransaction.sign(PrivateKey.fromString(submitKey));
        await topicSubmitMessageTransaction.sign(PrivateKey.fromString(this.hederaPrivateKey));

        const response = await topicSubmitMessageTransaction.execute(this.client);
        const receipt = await response.getReceipt(this.client);

        return receipt.topicSequenceNumber.toNumber();
    }

    public async getMessageFromTopic(topicId: string, sequenceNumber: number): Promise<string> {
        const topicMessageQuery = new TopicMessageQuery({
            topicId: topicId
        }).setStartTime(0);

        const message: string = await new Promise((resolve, reject) => {
            topicMessageQuery.subscribe(
                this.client,
                (error: unknown) => {
                    reject(error);
                },
                (topicMessage: TopicMessage) => {
                    // Check if the original message was split among different chunks
                    if (topicMessage.chunks.length > 0) {
                        for (const chunk of topicMessage.chunks) {
                            if ((chunk.sequenceNumber as Long).toNumber() === Number(sequenceNumber)) {
                                resolve(Buffer.from(topicMessage.contents).toString('base64'));
                            }
                        }
                    }

                    // Check if the original message is kept within just one message (no chunks)
                    if ((topicMessage.sequenceNumber as Long).toNumber() === Number(sequenceNumber)) {
                        resolve(Buffer.from(topicMessage.contents).toString('base64'));
                    }
                }
            );
        });

        return message;
    }

    public async getTopicInfo(topicId: string): Promise<TopicInfo> {
        const topicInfo = new TopicInfoQuery({
            topicId: topicId
        });

        const topicInfoResponse: TopicInfo = await topicInfo.execute(this.client);

        return topicInfoResponse;
    }

    public async createFile(contents?: string): Promise<string> {
        const fileCreateTransaction: FileCreateTransaction = new FileCreateTransaction({
            keys: [PrivateKey.fromString(this.hederaPrivateKey).publicKey],
            contents: contents
        });

        await fileCreateTransaction.freezeWith(this.client);
        await fileCreateTransaction.sign(PrivateKey.fromString(this.hederaPrivateKey));

        const fileCreateTransactionResponse = await fileCreateTransaction.execute(this.client);
        const fileCreateTransactionReceipt = await fileCreateTransactionResponse.getReceipt(this.client);

        if (!fileCreateTransactionReceipt.fileId) {
            throw new Error('Error while fetching file id from file creation transaction receipt');
        }

        return fileCreateTransactionReceipt.fileId.toString();
    }

    public async appendToFile(fileId: string, contents: string): Promise<void> {
        const fileAppendTransaction: FileAppendTransaction = new FileAppendTransaction({
            fileId: fileId,
            contents: contents,
        });

        await fileAppendTransaction.freezeWith(this.client);
        await fileAppendTransaction.sign(PrivateKey.fromString(this.hederaPrivateKey));

        await fileAppendTransaction.execute(this.client);
    }

    public async getFileContents(fileId: string): Promise<string> {
        const fileGetContentsQuery: FileContentsQuery = new FileContentsQuery({
            fileId: fileId
        });

        const fileContentsUint8Array: Uint8Array = await fileGetContentsQuery.execute(this.client);
        let fileContentsString: string = fileContentsUint8Array.toString();

        return fileContentsString;
    }
}
