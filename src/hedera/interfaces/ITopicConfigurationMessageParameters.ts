export interface ITopicConfigurationMessageParameters {
  algorithm: string;
  size: number;
  participants: Array<string>;
  submitKey: string;
  metadata: unknown;
}
