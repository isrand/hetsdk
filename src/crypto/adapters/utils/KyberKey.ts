export class KyberKey {
  public constructor(private readonly keyIntArray: Uint8Array) { }

  public toString(encoding: BufferEncoding): string {
    return Buffer.from(this.keyIntArray).toString(encoding);
  }
}
