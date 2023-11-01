export interface TopicMemoObject {
    // "s" is the storage options for the topic
    s: TopicMemoStorageObject;
}

interface TopicMemoStorageObject {
    // "c" is the key containing storage options for the topic configuration message
    c: TopicMemoConfigurationStorageObject;

    // "m" is the key containing storage options for all topic messages
    m: TopicMemoMessageStorageObject;
}

interface TopicMemoConfigurationStorageObject {
    // "u" is a boolean that indicates whether to use the File Service or not
    u: boolean;

    // "i" is the ID of the File where the topic configuration object is stored, if "u" is set to true
    i?: string;
}

interface TopicMemoMessageStorageObject {
    // "u" is a boolean that indicates whether to use the File Service or not
    u: boolean;
}
