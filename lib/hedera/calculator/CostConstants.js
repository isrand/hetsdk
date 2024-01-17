"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CostConstants = void 0;
/*
 * This file contains the cost (in USD) of the main operations the SDK performs on the Hedera Network.
 * These values are derived from repeated testing of the SDK and logging + averaging of the real costs.
 * They are heavily hardcoded and in constant change, so they can only provide a rough estimate of the expected
 * costs of using the SDK.
 *
 * I am currently not aware of any Hedera API that returns these values in realtime, which would be really helpful.
 * Should this change in the future I'll develop a smarter approach.
 */
var CostConstants;
(function (CostConstants) {
    // Consensus Service
    CostConstants[CostConstants["ConsensusCreateTopic"] = 0.011] = "ConsensusCreateTopic";
    CostConstants[CostConstants["ConsensusUpdateTopic"] = 0.0001] = "ConsensusUpdateTopic";
    CostConstants[CostConstants["ConsensusGetTopicInfo"] = 0.0001] = "ConsensusGetTopicInfo";
    CostConstants[CostConstants["ConsensusSubmitMessagePerCharacter"] = 3.2e-7] = "ConsensusSubmitMessagePerCharacter";
    CostConstants[CostConstants["ConsensusGetMessage"] = 0.0001] = "ConsensusGetMessage";
    // File Service
    CostConstants[CostConstants["FileCreate"] = 0.039] = "FileCreate";
    CostConstants[CostConstants["FileAppendPerCharacter"] = 0.000025] = "FileAppendPerCharacter";
    CostConstants[CostConstants["FileGetContents"] = 0.0001] = "FileGetContents";
})(CostConstants || (exports.CostConstants = CostConstants = {}));
//# sourceMappingURL=CostConstants.js.map