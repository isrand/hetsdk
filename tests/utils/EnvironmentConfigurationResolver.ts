import fs from "fs";
import path from "path";
import {IConfig} from "./IConfig";
import {Errors} from "../../src/errors/Errors";

export class EnvironmentConfigurationResolver {
    public constructor(private readonly env: string) {
    }

    public resolve(): IConfig {
        if (String(this.env) !== 'CI') {
            if (!fs.existsSync(path.resolve(__dirname, '..', '.env'))) {
                throw new Error(Errors.EnvFileNotFound);
            }

            require('dotenv').config(
                { path: path.resolve(__dirname, '..', '.env') }
            );
        }

        return {
            hederaAccountId: String(process.env.HEDERA_ACCOUNT_ID),
            hederaPrivateKey: String(process.env.HEDERA_PRIVATE_KEY),
            hederaAccountIdTwo: String(process.env.HEDERA_ACCOUNT_ID_2),
            hederaPrivateKeyTwo: String(process.env.HEDERA_PRIVATE_KEY_2)
        }
    }
}
