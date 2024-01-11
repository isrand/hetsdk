export class StringGenerator {
    private readonly characters: string = 'abcdefghijklmnopqrstuvwxyz';
    public constructor(private readonly sizeInBytes: number) { }

    public generate(): string {
        let finalString = '';
        for (let i = 0; i < this.sizeInBytes; i++) {
            finalString += this.characters.charAt(Math.floor(Math.random() * this.characters.length));
        }

        return finalString;
    }
}
