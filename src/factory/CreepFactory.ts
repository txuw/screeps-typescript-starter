import { CreepConfig, CreepProductionResult } from "../types/CreepConfig";

export class CreepFactory {
  private static instance: CreepFactory;
  private spawnName: string = "Spawn1";

  private constructor() {}

  public static getInstance(): CreepFactory {
    if (!CreepFactory.instance) {
      CreepFactory.instance = new CreepFactory();
    }
    return CreepFactory.instance;
  }

  /**
   * 生成唯一的creep名称
   * @param role 兵种角色
   * @returns 格式为 "role-YYYYMMDD-HHMMSS" 的唯一名称（使用UTC+8中国时区）
   */
  private generateCreepName(role: string): string {
    const now = new Date();
    // 获取UTC+8时区的时间
    const chinaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000) + (now.getTimezoneOffset() * 60 * 1000));

    const year = chinaTime.getUTCFullYear();
    const month = String(chinaTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(chinaTime.getUTCDate()).padStart(2, '0');
    const hours = String(chinaTime.getUTCHours()).padStart(2, '0');
    const minutes = String(chinaTime.getUTCMinutes()).padStart(2, '0');
    const seconds = String(chinaTime.getUTCSeconds()).padStart(2, '0');

    return `${role}-${year}${month}${day}-${hours}${minutes}${seconds}`;
  }

  /**
   * 统计当前指定角色的creep数量
   * @param role 角色名称
   * @returns 当前该角色creep的数量
   */
  public getCurrentCreepCount(role: string): number {
    let count = 0;
    for (const creepName in Game.creeps) {
      const creep = Game.creeps[creepName];
      if (creep.memory.role === role) {
        count++;
      }
    }
    return count;
  }

  /**
   * 生产单个creep
   * @param config creep配置
   * @returns 生产结果
   */
  public produceCreep(config: CreepConfig): CreepProductionResult {
    const spawn = Game.spawns[this.spawnName];
    if (!spawn) {
      return {
        success: false,
        error: `Spawn ${this.spawnName} not found`
      };
    }

    // 检查当前数量是否已达上限
    const currentCount = this.getCurrentCreepCount(config.role);
    if (currentCount >= config.maxCount) {
      return {
        success: false,
        error: `Maximum count (${config.maxCount}) reached for role ${config.role}`
      };
    }

    // 检查spawn是否正在生产
    if (spawn.spawning) {
      return {
        success: false,
        error: `Spawn is currently busy`
      };
    }

    // 生成creep名称
    const creepName = this.generateCreepName(config.role);

    // 尝试生产creep
    const result = spawn.spawnCreep(config.bodyParts, creepName, {
      memory: {
        role: config.role,
        room: spawn.room.name,
        working: false,
        upgrading: false,
        building: false,
        targetSourceId: undefined
      }
    });

    if (result === OK) {
      return {
        success: true,
        creepName: creepName
      };
    } else {
      return {
        success: false,
        error: `Failed to spawn creep: ${result}`
      };
    }
  }

  /**
   * 根据配置列表进行贪心生产
   * 优先生产优先级高且数量不足的creep
   * @param configs creep配置列表
   * @returns 生产结果
   */
  public greedyProduction(configs: CreepConfig[]): CreepProductionResult {
    // 按优先级排序（数字越小优先级越高）
    const sortedConfigs = [...configs].sort((a, b) => a.priority - b.priority);

    for (const config of sortedConfigs) {
      const currentCount = this.getCurrentCreepCount(config.role);

      // 检查是否需要生产
      if (currentCount < config.maxCount) {
        const result = this.produceCreep(config);

        // 如果生产成功或者是因为资源不足外的其他原因失败，返回结果
        if (result.success || (!result.error?.includes("busy") && !result.error?.includes("Maximum count"))) {
          return result;
        }
      }
    }

    return {
      success: false,
      error: "All creep types are at maximum capacity"
    };
  }

  /**
   * 获取所有兵种的当前数量统计
   * @param configs creep配置列表
   * @returns 各兵种数量统计
   */
  public getCreepStatistics(configs: CreepConfig[]): { [role: string]: { current: number; max: number; needsProduction: boolean } } {
    const stats: { [role: string]: { current: number; max: number; needsProduction: boolean } } = {};

    for (const config of configs) {
      const current = this.getCurrentCreepCount(config.role);
      stats[config.role] = {
        current: current,
        max: config.maxCount,
        needsProduction: current < config.maxCount
      };
    }

    return stats;
  }

  /**
   * 设置spawn名称（默认为"Spawn1"）
   * @param name spawn名称
   */
  public setSpawnName(name: string): void {
    this.spawnName = name;
  }
}
