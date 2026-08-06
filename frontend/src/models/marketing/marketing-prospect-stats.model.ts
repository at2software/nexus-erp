import { Serializable } from "@models/_core/serializable";
import { Model } from "@constants/model/type-discriminators";

@Model('MarketingProspectStats')
export class MarketingProspectStats extends Serializable {
    static API_PATH = (): string => 'marketing_prospects';

    total!: number;
    by_status!: {
        new: number;
        engaged: number;
        converted: number;
    };
    activities_pending!: number;
    activities_overdue!: number;
}