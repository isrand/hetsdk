"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HederaStub = void 0;
const sdk_1 = require("@hashgraph/sdk");
class HederaStub {
    constructor(client, hederaPrivateKey, hederaAccountId) {
        this.client = client;
        this.hederaPrivateKey = hederaPrivateKey;
        this.hederaAccountId = hederaAccountId;
        this.maxAppendTransactionSize = 4000 - 256; // Hedera's 4KB max append transaction size minus buffer just in case.
    }
    createTopic(submitKey, topicMemoObject) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const topicCreateTransaction = new sdk_1.TopicCreateTransaction({
                adminKey: sdk_1.PrivateKey.fromString(this.hederaPrivateKey),
                autoRenewAccountId: this.hederaAccountId
            });
            topicCreateTransaction.setSubmitKey(sdk_1.PrivateKey.fromString(submitKey));
            if (topicMemoObject) {
                topicCreateTransaction.setTopicMemo(JSON.stringify(topicMemoObject));
            }
            topicCreateTransaction.freezeWith(this.client);
            yield topicCreateTransaction.sign(sdk_1.PrivateKey.fromString(this.hederaPrivateKey));
            const encryptedTopicCreationResponse = yield topicCreateTransaction.execute(this.client);
            const encryptedTopicCreationReceipt = yield encryptedTopicCreationResponse.getReceipt(this.client);
            return ((_a = encryptedTopicCreationReceipt.topicId) === null || _a === void 0 ? void 0 : _a.toString()) || '';
        });
    }
    submitMessageToTopic(submitKey, topicId, contents) {
        return __awaiter(this, void 0, void 0, function* () {
            const topicSubmitMessageTransaction = new sdk_1.TopicMessageSubmitTransaction({
                topicId: topicId,
                message: contents
            });
            topicSubmitMessageTransaction.freezeWith(this.client);
            yield topicSubmitMessageTransaction.sign(sdk_1.PrivateKey.fromString(submitKey));
            yield topicSubmitMessageTransaction.sign(sdk_1.PrivateKey.fromString(this.hederaPrivateKey));
            const response = yield topicSubmitMessageTransaction.execute(this.client);
            const receipt = yield response.getReceipt(this.client);
            return Number(receipt.topicSequenceNumber);
        });
    }
    getMessageFromTopic(sequenceNumber, topicId) {
        return __awaiter(this, void 0, void 0, function* () {
            const topicMessageQuery = new sdk_1.TopicMessageQuery({
                topicId: topicId
            }).setStartTime(0);
            return new Promise((resolve) => {
                topicMessageQuery.subscribe(this.client, null, (topicMessage) => {
                    // Check if the original message was split among different chunks
                    if (topicMessage.chunks.length > 0) {
                        for (const chunk of topicMessage.chunks) {
                            if (Number(chunk.sequenceNumber) === Number(sequenceNumber)) {
                                resolve(Buffer.from(topicMessage.contents).toString('base64'));
                            }
                        }
                    }
                    // Check if the original message is kept within just one message (no chunks)
                    if (Number(topicMessage.sequenceNumber) === Number(sequenceNumber)) {
                        resolve(Buffer.from(topicMessage.contents).toString('base64'));
                    }
                });
            });
        });
    }
    getTopicInfo(topicId) {
        return __awaiter(this, void 0, void 0, function* () {
            const topicInfo = new sdk_1.TopicInfoQuery({
                topicId: topicId
            });
            return topicInfo.execute(this.client);
        });
    }
    createFile(contents) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const fileCreateTransaction = new sdk_1.FileCreateTransaction({
                keys: [sdk_1.PrivateKey.fromString(this.hederaPrivateKey).publicKey],
                contents: contents
            }).setMaxTransactionFee(new sdk_1.Hbar(5));
            fileCreateTransaction.freezeWith(this.client);
            yield fileCreateTransaction.sign(sdk_1.PrivateKey.fromString(this.hederaPrivateKey));
            const fileCreateTransactionResponse = yield fileCreateTransaction.execute(this.client);
            const fileCreateTransactionReceipt = yield fileCreateTransactionResponse.getReceipt(this.client);
            return ((_a = fileCreateTransactionReceipt.fileId) === null || _a === void 0 ? void 0 : _a.toString()) || '';
        });
    }
    appendToFile(fileId, contents) {
        return __awaiter(this, void 0, void 0, function* () {
            let index = 0;
            let newString = '';
            while (index <= contents.length) {
                if ((newString + contents[index]).length < this.maxAppendTransactionSize) {
                    // Edge case: append last characters while still below max allowed transaction size
                    if (index === contents.length - 1) {
                        newString += contents[contents.length - 1];
                        const fileAppendTransaction = new sdk_1.FileAppendTransaction({
                            fileId: fileId,
                            contents: newString
                        }).setMaxTransactionFee(new sdk_1.Hbar(5));
                        fileAppendTransaction.freezeWith(this.client);
                        yield fileAppendTransaction.sign(sdk_1.PrivateKey.fromString(this.hederaPrivateKey));
                        yield fileAppendTransaction.execute(this.client);
                        break;
                    }
                    newString += contents[index];
                    index++;
                }
                else {
                    const fileAppendTransaction = new sdk_1.FileAppendTransaction({
                        fileId: fileId,
                        contents: newString
                    }).setMaxTransactionFee(new sdk_1.Hbar(5));
                    fileAppendTransaction.freezeWith(this.client);
                    yield fileAppendTransaction.sign(sdk_1.PrivateKey.fromString(this.hederaPrivateKey));
                    yield fileAppendTransaction.execute(this.client);
                    newString = '';
                }
            }
        });
    }
    getFileContents(fileId) {
        return __awaiter(this, void 0, void 0, function* () {
            const fileGetContentsQuery = new sdk_1.FileContentsQuery({
                fileId: fileId
            });
            const fileContentsUint8Array = yield fileGetContentsQuery.execute(this.client);
            return fileContentsUint8Array.toString();
        });
    }
}
exports.HederaStub = HederaStub;
//# sourceMappingURL=HederaStub.js.map