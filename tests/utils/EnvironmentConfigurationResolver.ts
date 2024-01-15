import fs from "fs";
import path from "path";
import {IConfig} from "./IConfig";

export class EnvironmentConfigurationResolver {
    public constructor(private readonly env: string) {
    }

    public resolve(): IConfig {
        if (String(this.env) !== 'CI') {
            if (!fs.existsSync(path.resolve(__dirname, '..', '.env'))) {
                throw new Error('.env file not found, please provide one (follow the .env.template file)');
            }

            require('dotenv').config(
                { path: path.resolve(__dirname, '..', '.env') }
            );
        }

        return {
            hederaAccountId: String(process.env.HEDERA_ACCOUNT_ID),
            hederaPrivateKey: String(process.env.HEDERA_PRIVATE_KEY)
        }
    }
}
