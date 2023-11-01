export interface TopicMemoObject {
    s: TopicMemoStorageObject;
}
interface TopicMemoStorageObject {
    c: TopicMemoConfigurationStorageObject;
    m: TopicMemoMessageStorageObject;
}
interface TopicMemoConfigurationStorageObject {
    u: boolean;
    i?: string;
}
interface TopicMemoMessageStorageObject {
    u: boolean;
}
export {};
