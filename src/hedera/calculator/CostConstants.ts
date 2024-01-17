/*
 * This file contains the cost (in USD) of the main operations the SDK performs on the Hedera Network.
 * These values are derived from repeated testing of the SDK and logging + averaging of the real costs.
 * They are heavily hardcoded and in constant change, so they can only provide a rough estimate of the expected
 * costs of using the SDK.
 *
 * I am currently not aware of any Hedera API that returns these values in realtime, which would be really helpful.
 * Should this change in the future I'll develop a smarter approach.
 */
export enum CostConstants {

  // Consensus Service
  ConsensusCreateTopic = 0.0110,
  ConsensusUpdateTopic = 0.000100,
  ConsensusGetTopicInfo = 0.000100,
  ConsensusSubmitMessagePerCharacter = 0.00000032,
  ConsensusGetMessage = 0.000100,

  // File Service
  FileCreate = 0.0390,
  FileAppendPerCharacter = 0.000025,
  FileGetContents = 0.000100
}
