import {TopicParticipant} from "./TopicParticipant";

export interface TopicConfigurationObject {
    // "s" is the topic's submit key
    s: string;

    // "p" is an array of topic participants
    p?: Array<TopicParticipant>;

    // "m" is the topic metadata object
    m?: unknown;
}
