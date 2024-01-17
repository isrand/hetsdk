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
exports.HederaStubCostCalculator = void 0;
const CostConstants_1 = require("./CostConstants");
const MockHederaStub_1 = require("../mock/MockHederaStub");
/*
 * The HederaStubCostCalculator is a class that allows the user to get a rough estimate of the costs they will incur when using the SDK.
 * It can be passed to the main class in its constructor as an IHederaStub-compliant class. This will effectively set the SDK in "dry-run"
 * mode, so to speak.
 */
class HederaStubCostCalculator {
    constructor() {
        this.mockHederaStub = new MockHederaStub_1.MockHederaStub();
        this.totalCost = 0;
    }
    createFile(contents) {
        return __awaiter(this, void 0, void 0, function* () {
            this.totalCost += CostConstants_1.CostConstants.FileCreate;
            return this.mockHederaStub.createFile(contents);
        });
    }
    appendToFile(fileId, contents) {
        return __awaiter(this, void 0, void 0, function* () {
            this.totalCost += CostConstants_1.CostConstants.FileAppendPerCharacter * contents.length;
            return this.mockHederaStub.appendToFile(fileId, contents);
        });
    }
    getFileContents(fileId) {
        return __awaiter(this, void 0, void 0, function* () {
            this.totalCost += CostConstants_1.CostConstants.FileGetContents;
            return this.mockHederaStub.getFileContents(fileId);
        });
    }
    createTopic(submitKey, topicMemoObject) {
        return __awaiter(this, void 0, void 0, function* () {
            this.totalCost += CostConstants_1.CostConstants.ConsensusCreateTopic;
            return this.mockHederaStub.createTopic(submitKey, topicMemoObject);
        });
    }
    updateTopicMemo(topicMemoObject, topicId) {
        return __awaiter(this, void 0, void 0, function* () {
            this.totalCost += CostConstants_1.CostConstants.ConsensusUpdateTopic;
            return this.mockHederaStub.updateTopicMemo(topicMemoObject, topicId);
        });
    }
    submitMessageToTopic(submitKey, topicId, contents) {
        return __awaiter(this, void 0, void 0, function* () {
            if (contents) {
                this.totalCost += CostConstants_1.CostConstants.ConsensusSubmitMessagePerCharacter * contents.length;
            }
            return this.mockHederaStub.submitMessageToTopic(submitKey, topicId, contents);
        });
    }
    getMessageFromTopic(sequenceNumber, topicId) {
        return __awaiter(this, void 0, void 0, function* () {
            this.totalCost += CostConstants_1.CostConstants.ConsensusGetMessage;
            return this.mockHederaStub.getMessageFromTopic(sequenceNumber, topicId);
        });
    }
    getTopicInfo(topicId) {
        return __awaiter(this, void 0, void 0, function* () {
            this.totalCost += CostConstants_1.CostConstants.ConsensusGetTopicInfo;
            return this.mockHederaStub.getTopicInfo(topicId);
        });
    }
    getTotalCost() {
        return this.totalCost;
    }
}
exports.HederaStubCostCalculator = HederaStubCostCalculator;
//# sourceMappingURL=HederaStubCostCalculator.js.map