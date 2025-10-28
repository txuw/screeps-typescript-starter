import { CreepConfig } from "../types/CreepConfig";

export class CommonConstant{
  static HARVESTER_NEED_LENGTH = 2;
  static BUILDER_NEED_LENGTH = 0;
  static UPGRADER_NEED_LENGTH = 2;
  static CARRY_NEED_LENGTH = 1;
  static CONTAINER_CARRY_NEED_LENGTH = 2;
  static STORAGE_CARRY_NEED_LENGTH = 1;
  static LINK_CARRY_NEED_LENGTH = 1;
  static HARVESTER = 'harvester';
  static UPGRADER = 'upgrader';
  static BUILDER = 'builder';
  static CARRY = 'carry';
  static CONTAINER_CARRY = 'containerCarry';
  static STORAGE_CARRY = 'storageCarry';
  static LINK_CARRY = 'linkCarry';

  // 塔配置
  static TOWER_ENABLED = true;
  static TOWER_ROOM_NAME = "W1N1"; // 根据实际房间名称修改

  // Source分配算法配置参数（移动到配置文件中）
  static SOURCE_DISTANCE_FACTOR = 2.5; // 距离系数：每距离10格需要多少个额外采集者
  static SOURCE_BASE_WORKERS = 1; // 基础采集者数量
  static SOURCE_MIN_WORKERS = 1; // 最少采集者数量
  static SOURCE_MAX_WORKERS = 4; // 最多采集者数量

  // Container分配算法配置参数
  static CONTAINER_DISTANCE_FACTOR = 1.5; // 距离系数：每距离10格需要多少个额外Carry
  static CONTAINER_BASE_WORKERS = 1; // 基础Carry数量
  static CONTAINER_MIN_WORKERS = 1; // 最少Carry数量
  static CONTAINER_MAX_WORKERS = 3; // 最多Carry数量

  // Link分配算法配置参数
  static LINK_DISTANCE_FACTOR = 1.2; // 距离系数：每距离10格需要多少个额外LinkCarry
  static LINK_BASE_WORKERS = 1; // 基础LinkCarry数量
  static LINK_MIN_WORKERS = 1; // 最少LinkCarry数量
  static LINK_MAX_WORKERS = 2; // 最多LinkCarry数量

  // Container分配策略配置
  static CONTAINER_ASSIGNMENT_STRATEGY = 'dynamic'; // 'nearest', 'round_robin', 'balance', 'dynamic'

  // Game全局变量缓存配置
  static CACHE_DURATION = 100; // 缓存有效期（tick数）
  static ENABLE_GLOBAL_CACHE = true; // 是否启用全局缓存

  /**
   * 兵种配置
   * priority: 数字越小优先级越高（优先生产）
   */
  static CREEP_CONFIGS: CreepConfig[] = [
    {
      role: CommonConstant.HARVESTER,
      bodyParts: [ MOVE, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK],
      maxCount: CommonConstant.HARVESTER_NEED_LENGTH,
      priority: 2 // 最高优先级
    },
    {
      role: CommonConstant.LINK_CARRY,
      bodyParts: [MOVE,MOVE, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY],
      maxCount: CommonConstant.LINK_CARRY_NEED_LENGTH,
      priority: 0 // 最高优先级，确保Link能量及时搬运
    },
    {
      role: CommonConstant.CONTAINER_CARRY,
      bodyParts: [MOVE,MOVE, MOVE, MOVE, MOVE, MOVE,MOVE, MOVE,  CARRY, CARRY, CARRY, CARRY, CARRY,  CARRY, CARRY, CARRY,  CARRY, CARRY],
      maxCount: CommonConstant.CONTAINER_CARRY_NEED_LENGTH,
      priority: 1 // 次高优先级，确保Container到Storage的物流
    },
    {
      role: CommonConstant.STORAGE_CARRY,
      bodyParts: [MOVE,MOVE, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY],
      maxCount: CommonConstant.STORAGE_CARRY_NEED_LENGTH,
      priority: 4 // 较低优先级，在Storage建成后再生产
    },
    {
      role: CommonConstant.CARRY,  // 基础搬运工，进行容错
      bodyParts: [MOVE,CARRY,CARRY,WORK],
      maxCount: CommonConstant.CARRY_NEED_LENGTH,
      priority: 0 // 最高优先级，
    },
    {
      role: CommonConstant.UPGRADER,
      bodyParts: [MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, WORK, WORK, WORK, WORK, WORK, WORK , WORK, WORK],
      maxCount: CommonConstant.UPGRADER_NEED_LENGTH,
      priority: 3
    },
    {
      role: CommonConstant.BUILDER,
      bodyParts: [MOVE, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY , CARRY, CARRY, CARRY, CARRY, WORK, WORK, WORK, WORK, WORK, WORK, WORK],
      maxCount: CommonConstant.BUILDER_NEED_LENGTH,
      priority: 5
    }
  ];
}
