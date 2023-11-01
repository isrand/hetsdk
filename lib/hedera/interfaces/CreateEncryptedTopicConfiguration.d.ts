import { TopicParticipant } from "./TopicParticipant";
import { EncryptionAlgorithm } from "../../crypto/enums/EncryptionAlgorithm";
import { TopicStorageOptions } from "./TopicStorageOptions";
export interface CreateEncryptedTopicConfiguration {
    participants: Array<TopicParticipant>;
    algorithm: EncryptionAlgorithm;
    storageOptions: TopicStorageOptions;
    metadata?: any;
}
