import { TopicParticipant } from "./TopicParticipant";
export interface TopicConfigurationObject {
    s: string;
    p?: Array<TopicParticipant>;
    m?: unknown;
}
