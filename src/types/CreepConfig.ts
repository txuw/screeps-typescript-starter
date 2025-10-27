export interface CreepConfig {
  role: string;
  body?: BodyPartConstant[]; // 新的主要字段（可选以支持旧格式）
  bodyParts?: BodyPartConstant[]; // 向后兼容字段
  maxCount: number;
  priority: number;
  needLength?: number; // 需要长度
}

export interface CreepProductionResult {
  success: boolean;
  creepName?: string;
  error?: string;
}
