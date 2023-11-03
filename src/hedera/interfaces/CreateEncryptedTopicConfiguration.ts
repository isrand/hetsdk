import {TopicParticipant} from "./TopicParticipant";
import {EncryptionAlgorithms} from "../../crypto/enums/EncryptionAlgorithms";
import {TopicStorageOptions} from "./TopicStorageOptions";

export interface CreateEncryptedTopicConfiguration {
    participants: Array<TopicParticipant>;
    algorithm: EncryptionAlgorithms;
    storageOptions: TopicStorageOptions;
    metadata?: any;
}
