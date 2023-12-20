/// <reference types="node" />
export declare class DefaultAdapter {
    symmetricEncrypt(dataToEncrypt: string, symmetricKey: Buffer, initVector: Buffer): string;
    symmetricDecrypt(dataToDecrypt: string, symmetricKey: Buffer, initVector: Buffer): string;
}
