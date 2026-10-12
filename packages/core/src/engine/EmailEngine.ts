import type {
    EmailBrand,
    EmailEngineConfig,
} from "../types/Engine.types.js";

export class EmailEngine {
    private readonly brand: EmailBrand;

    constructor(config: EmailEngineConfig) {
        if (
            !config?.brand?.name ||
            config.brand.name.trim().length === 0
        ) {
            throw new Error(
                "EmailEngine: brand.name is required"
            );
        }

        this.brand = { ...config.brand };
    }

    public getBrand(): EmailBrand {
        return { ...this.brand };
    }

    public getVersion(): string {
        return "0.1.0";
    }
}