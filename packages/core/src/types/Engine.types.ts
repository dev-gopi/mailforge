export interface EmailBrand {
    name: string;
    logo?: string;
    website?: string;
    primaryColor?: string;
}

export interface EmailEngineConfig {
    brand: EmailBrand;
}