import { SentinelNodeType } from "src/enums/sentinel-node.type"

export class SentinelNode {

  id!: number;
  type: SentinelNodeType;
  label: string;
  condition?: string;
}
