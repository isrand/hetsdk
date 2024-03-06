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
exports.MockHederaStub = void 0;
const MockTopic_1 = require("./MockTopic");
const MockFile_1 = require("./MockFile");
const Errors_1 = require("../../errors/Errors");
class MockHederaStub {
    constructor() {
        this.topics = new Map();
        this.files = new Map();
        this.maxAppendTransactionSize = 4000 - 256; // Hedera's 4KB max append transaction size minus buffer just in case.
    }
    createFile(contents) {
        return __awaiter(this, void 0, void 0, function* () {
            const file = new MockFile_1.MockFile(contents);
            const fileId = file.getId();
            this.files.set(fileId, file);
            return Promise.resolve(fileId);
        });
    }
    appendToFile(fileId, contents) {
        return __awaiter(this, void 0, void 0, function* () {
            const file = this.files.get(fileId);
            if (!file) {
                throw new Error(Errors_1.Errors.FileDoesNotExist);
            }
            let index = 0;
            let newString = '';
            while (index <= contents.length) {
                if ((newString + contents[index]).length < this.maxAppendTransactionSize) {
                    newString += contents[index];
                    if (index === contents.length - 1) {
                        file.append(newString);
                    }
                    index++;
                }
                else {
                    file.append(newString);
                    newString = '';
                }
            }
            return Promise.resolve();
        });
    }
    getFileContents(fileId) {
        return __awaiter(this, void 0, void 0, function* () {
            const file = this.files.get(fileId);
            if (!file) {
                throw new Error(Errors_1.Errors.FileDoesNotExist);
            }
            return Promise.resolve(file.getContents());
        });
    }
    createTopic(submitKey, topicMemoObject) {
        return __awaiter(this, void 0, void 0, function* () {
            const topic = new MockTopic_1.MockTopic(submitKey, topicMemoObject);
            const topicId = topic.getId();
            this.topics.set(topicId, topic);
            return Promise.resolve(topicId);
        });
    }
    updateTopicMemo(topicMemoObject, topicId) {
        return __awaiter(this, void 0, void 0, function* () {
            const topic = this.topics.get(String(topicId));
            if (!topic) {
                throw new Error(Errors_1.Errors.TopicDoesNotExist);
            }
            topic.setMemo(topicMemoObject);
            return Promise.resolve();
        });
    }
    submitMessageToTopic(submitKey, topicId, contents) {
        return __awaiter(this, void 0, void 0, function* () {
            const topic = this.topics.get(String(topicId));
            if (!topic) {
                throw new Error(Errors_1.Errors.TopicDoesNotExist);
            }
            if (topic.getSubmitKey() !== submitKey) {
                throw new Error(Errors_1.Errors.WrongSubmitKeyUsed);
            }
            return Promise.resolve(topic.submitMessage(String(contents)));
        });
    }
    getMessageFromTopic(sequenceNumber, topicId) {
        return __awaiter(this, void 0, void 0, function* () {
            const topic = this.topics.get(String(topicId));
            if (!topic) {
                throw new Error(Errors_1.Errors.TopicDoesNotExist);
            }
            return Promise.resolve(topic.getMessage(sequenceNumber));
        });
    }
    getTopicInfo(topicId) {
        return __awaiter(this, void 0, void 0, function* () {
            const topic = this.topics.get(String(topicId));
            if (!topic) {
                throw new Error(Errors_1.Errors.TopicDoesNotExist);
            }
            return Promise.resolve(topic.getInfo());
        });
    }
}
exports.MockHederaStub = MockHederaStub;
//# sourceMappingURL=MockHederaStub.js.map