import {TopicParticipant} from "./TopicParticipant";
import {TopicEncryptionAlgorithms} from "../../crypto/Crypto";

export interface CreateEncryptedTopicConfiguration {
    participants: Array<TopicParticipant>;
    algorithm: TopicEncryptionAlgorithms;
    storeParticipantsArray: boolean;
    metadata?: any;
}
