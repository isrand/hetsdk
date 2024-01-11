import {StringGenerator} from "./StringGenerator";

describe("The StringGenerator", () => {
    describe("constructor", () => {
        test("should return a valid StringGenerator object", () => {
            const stringGenerator = new StringGenerator(0);

            expect(stringGenerator).toBeDefined();
        });
    });

    describe("generateString function", () => {
        test("should generate a string of the given size", () => {
            let oneKiloByte = 1000; // 1 KB
            const oneKiloByteLongString = new StringGenerator(oneKiloByte).generate();

            expect(oneKiloByteLongString.length).toEqual(oneKiloByte);

            let oneMegaByte = oneKiloByte * 1000; // 1 MB

            const oneMegabyteLongString = new StringGenerator(oneMegaByte).generate();

            expect(oneMegabyteLongString.length).toEqual(oneMegaByte);
        });
    });
});
