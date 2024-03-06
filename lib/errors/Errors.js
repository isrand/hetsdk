"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Errors = void 0;
var Errors;
(function (Errors) {
    // index.ts
    Errors["TopicConfigurationMessageMaximumConsensusMessageSizeExceeded"] = "Topic configuration object exceeds maximum message size allowed for Consensus Service. Please use the File Service instead.";
    Errors["AddParticipantToConsensusServiceTopic"] = "New participants can only be added to topics that use the File Service as storage medium for their configuration. Requested topic uses the Consensus Service.";
    Errors["MaximumMessageSizeExceededAfterEncryption"] = "Final message after encryption exceeds maximum message size allowed for Consensus Service. Please use the File Service instead.";
    Errors["RotateEncryptionKeyOnConsensusServiceTopic"] = "Topic encryption key rotation is only available in encrypted topics that use the File Service as storage medium for their configuration. Requested topic uses the Consensus Service.";
    Errors["GetParticipantsFromTopicWithoutStoredParticipants"] = "Topic did not choose to store participants upon creation, cannot fetch list of participants.";
    Errors["RotateEncryptionKeyOnTopicWithoutStoredParticipants"] = "Topic did not choose to store participants upon creation, topic encryption key rotation is not possible.";
    Errors["MigrateFileServiceTopicToFileServiceTopic"] = "Cannot migrate configuration storage medium: topic already uses File Service as storage medium.";
    Errors["TopicParticipantsAlreadyStored"] = "Topic already stores participants in a separate topic.";
    Errors["TopicSequenceNumberLowerThanRequested"] = "Topic sequence number is lower than the one provided.";
    // RSA.ts & Kyber.ts
    Errors["AccessDeniedFetchTopicData"] = "Error fetching topic data. Does user have access?";
    Errors["AccessDeniedFetchTopicEncryptionKeyAndInitVector"] = "Error fetching topic encryption key and init vector. Does user have access?";
    Errors["PublicKeyWrongSize"] = "Public key is of wrong size. (Is the key base64 encoded?)";
    Errors["KyberInitializedWithWrongSize"] = "Kyber adapter was initialized with wrong key size. Available sizes are 512, 768 and 1024.";
    Errors["KyberUsedOnNonKyberTopic"] = "Encrypted topic keys object does not have encapsulated symmetric keys. (Are you trying to use Kyber on a non-Kyber encrypted topic?)";
    // MockHederaStub.ts
    Errors["FileDoesNotExist"] = "File does not exist.";
    Errors["TopicDoesNotExist"] = "Topic does not exist.";
    Errors["WrongSubmitKeyUsed"] = "Wrong submit key used to submit messages on topic.";
    // EnvironmentConfigurationResolver.ts
    Errors["EnvFileNotFound"] = ".env file not found, please provide one (follow the .env.template file)";
})(Errors || (exports.Errors = Errors = {}));
//# sourceMappingURL=Errors.js.map