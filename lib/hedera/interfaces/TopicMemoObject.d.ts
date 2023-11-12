export interface TopicMemoObject {
    s: TopicMemoStorageObject;
}
interface TopicMemoStorageObject {
    c: TopicMemoConfigurationStorageObject;
    m: TopicMemoMessageStorageObject;
    p: TopicMemoParticipantsStorageObject;
}
interface TopicMemoConfigurationStorageObject {
    f: boolean;
    i?: string;
}
interface TopicMemoMessageStorageObject {
    f: boolean;
}
interface TopicMemoParticipantsStorageObject {
    p: boolean;
    i?: string;
}
export {};
