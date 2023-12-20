import {Crypto} from "../../../src/crypto/Crypto";

describe("The Crypto class", () => {
    describe("constructor", () => {
        test("should return a valid Crypto class that uses RSA as its adapter", () => {
            expect(new Crypto('rsa', 2048)).toBeDefined();
        });

        test("should return a valid Crypto class that uses Kyber as its adapter with 512-bit length size", () => {
            expect(new Crypto('kyber', 512)).toBeDefined();
        });

        test("should return a valid Crypto class that uses Kyber as its adapter with 768-bit length size", () => {
            expect(new Crypto('kyber', 768)).toBeDefined();
        });

        test("should return a valid Crypto class that uses Kyber as its adapter with 1024-bit length size", () => {
            expect(new Crypto('kyber', 1024)).toBeDefined();
        });
    });
});
