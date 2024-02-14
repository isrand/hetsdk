/// <reference types="node" />
export declare class KyberKey {
    private readonly keyIntArray;
    constructor(keyIntArray: Uint8Array);
    toString(encoding: BufferEncoding): string;
}
