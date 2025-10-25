export interface CreepConfig {
  role: string;
  bodyParts: BodyPartConstant[];
  maxCount: number;
  priority: number;
}

export interface CreepProductionResult {
  success: boolean;
  creepName?: string;
  error?: string;
}
