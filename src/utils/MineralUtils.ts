import { GLOBAL_ALGORITHM_CONFIG } from '../config/GlobalConstants';

export class MineralUtils {
  /**
   * 检查房间是否支持矿物采集
   * @param room 房间对象
   * @returns 是否支持矿物采集
   */
  static canMineMineral(room: Room): boolean {
    // 检查是否有矿物
    const mineral = this.findMineral(room);
    if (!mineral) {
      return false;
    }

    // 检查矿物储量
    if (mineral.mineralAmount === 0) {
      return false;
    }

    // 检查是否有EXTRACTOR
    const extractor = this.findExtractor(room, mineral);
    if (!extractor) {
      return false;
    }

    return true;
  }

  /**
   * 查找房间的矿物
   * @param room 房间对象
   * @returns 矿物对象或null
   */
  static findMineral(room: Room): Mineral | null {
    const minerals = room.find(FIND_MINERALS);
    return minerals.length > 0 ? minerals[0] : null;
  }

  /**
   * 查找矿物对应的EXTRACTOR
   * @param room 房间对象
   * @param mineral 矿物对象
   * @returns EXTRACTOR对象或null
   */
  static findExtractor(room: Room, mineral: Mineral): StructureExtractor | null {
    const extractors = room.find(FIND_MY_STRUCTURES, {
      filter: structure => structure.structureType === STRUCTURE_EXTRACTOR
    });

    // 查找与矿物位置相同的extractor
    for (const extractor of extractors) {
      if (extractor.pos.isNearTo(mineral)) {
        return extractor as StructureExtractor;
      }
    }

    return null;
  }

  /**
   * 获取矿物的储量信息
   * @param room 房间对象
   * @returns 矿物储量信息
   */
  static getMineralReserves(room: Room): { mineralType: MineralConstant; amount: number } | null {
    const mineral = this.findMineral(room);
    if (!mineral) {
      return null;
    }

    return {
      mineralType: mineral.mineralType,
      amount: mineral.mineralAmount
    };
  }

  /**
   * 检查是否应该建造矿物采集者
   * @param room 房间对象
   * @returns 是否应该建造
   */
  static shouldBuildMiner(room: Room): boolean {
    // 检查基础条件
    if (!this.canMineMineral(room)) {
      return false;
    }

    // 检查矿物储量是否达到阈值
    const reserves = this.getMineralReserves(room);
    if (!reserves || reserves.amount < GLOBAL_ALGORITHM_CONFIG.MINER_CONFIG.MINERAL_THRESHOLD) {
      return false;
    }

    return true;
  }

  /**
   * 获取矿物采集冷却时间
   * @returns 冷却时间（ticks）
   */
  static getMineralCooldown(): number {
    return GLOBAL_ALGORITHM_CONFIG.MINER_CONFIG.COOLDOWN_TICKS;
  }

  /**
   * 生成矿物采集者的身体部件
   * @returns 身体部件数组
   */
  static generateMinerBody(): BodyPartConstant[] {
    const config = GLOBAL_ALGORITHM_CONFIG.MINER_CONFIG;
    const body: BodyPartConstant[] = [];

    // 添加MOVE部件
    for (let i = 0; i < config.MOVE_PARTS; i++) {
      body.push(MOVE);
    }

    // 添加CARRY部件
    for (let i = 0; i < config.CARRY_PARTS; i++) {
      body.push(CARRY);
    }

    // 添加WORK部件
    for (let i = 0; i < config.WORK_PARTS; i++) {
      body.push(WORK);
    }

    return body;
  }

  /**
   * 计算矿物采集者的成本
   * @returns 能量成本
   */
  static calculateMinerCost(): number {
    const config = GLOBAL_ALGORITHM_CONFIG.MINER_CONFIG;
    const moveCost = config.MOVE_PARTS * BODYPART_COST[MOVE];
    const carryCost = config.CARRY_PARTS * BODYPART_COST[CARRY];
    const workCost = config.WORK_PARTS * BODYPART_COST[WORK];

    return moveCost + carryCost + workCost;
  }
}