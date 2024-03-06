export enum Errors {
  // index.ts
  TopicConfigurationMessageMaximumConsensusMessageSizeExceeded = 'Topic configuration object exceeds maximum message size allowed for Consensus Service. Please use the File Service instead.',
  AddParticipantToConsensusServiceTopic = 'New participants can only be added to topics that use the File Service as storage medium for their configuration. Requested topic uses the Consensus Service.',
  MaximumMessageSizeExceededAfterEncryption = 'Final message after encryption exceeds maximum message size allowed for Consensus Service. Please use the File Service instead.',
  RotateEncryptionKeyOnConsensusServiceTopic = 'Topic encryption key rotation is only available in encrypted topics that use the File Service as storage medium for their configuration. Requested topic uses the Consensus Service.',
  GetParticipantsFromTopicWithoutStoredParticipants = 'Topic did not choose to store participants upon creation, cannot fetch list of participants.',
  RotateEncryptionKeyOnTopicWithoutStoredParticipants = 'Topic did not choose to store participants upon creation, topic encryption key rotation is not possible.',
  MigrateFileServiceTopicToFileServiceTopic = 'Cannot migrate configuration storage medium: topic already uses File Service as storage medium.',
  TopicParticipantsAlreadyStored = 'Topic already stores participants in a separate topic.',
  TopicSequenceNumberLowerThanRequested = 'Topic sequence number is lower than the one provided.',

  // RSA.ts & Kyber.ts
  AccessDeniedFetchTopicData = 'Error fetching topic data. Does user have access?',
  AccessDeniedFetchTopicEncryptionKeyAndInitVector = 'Error fetching topic encryption key and init vector. Does user have access?',
  PublicKeyWrongSize = 'Public key is of wrong size. (Is the key base64 encoded?)',
  KyberInitializedWithWrongSize = 'Kyber adapter was initialized with wrong key size. Available sizes are 512, 768 and 1024.',
  KyberUsedOnNonKyberTopic = 'Encrypted topic keys object does not have encapsulated symmetric keys. (Are you trying to use Kyber on a non-Kyber encrypted topic?)',

  // MockHederaStub.ts
  FileDoesNotExist = 'File does not exist.',
  TopicDoesNotExist = 'Topic does not exist.',
  WrongSubmitKeyUsed = 'Wrong submit key used to submit messages on topic.',

  // EnvironmentConfigurationResolver.ts
  EnvFileNotFound = '.env file not found, please provide one (follow the .env.template file)'
}
