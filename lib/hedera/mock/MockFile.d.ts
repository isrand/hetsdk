export declare class MockFile {
    private contents;
    private readonly fileId;
    constructor(contents?: string);
    getId(): string;
    getContents(): string;
    append(contents: string): void;
}
