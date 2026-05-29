import { Serializable } from "@models/serializable";
import { MarketingService } from "./marketing.service";
import { Model } from "@constants/type-discriminators";

@Model('MarketingProspectStats')
export class MarketingProspectStats extends Serializable {
    static API_PATH = (): string => 'marketing_prospects';
    SERVICE = MarketingService;

    total!: number;
    by_status!: {
        new: number;
        engaged: number;
        converted: number;
    };
    activities_pending!: number;
    activities_overdue!: number;
}