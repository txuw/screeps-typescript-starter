import { CommonConstant } from "../common/CommonConstant";
import { GameCacheManager } from "./GameCacheManager";

/**
 * Source分配策略枚举
 */
export enum SourceAssignmentStrategy {
  FIXED = 'fixed',           // 固定分配
  LOAD_BALANCE = 'balance',  // 负载均衡
  ROUND_ROBIN = 'round_robin' // 轮询分配
}

/**
 * Container分配策略枚举
 */
export enum ContainerAssignmentStrategy {
  NEAREST = 'nearest',       // 最近距离
  ROUND_ROBIN = 'round_robin', // 轮询分配
  LOAD_BALANCE = 'balance'   // 负载均衡（基于存储量）
}

/**
 * Source工具类，提供Source和Container的分配算法
 */
export class SourceUtils {

  /**
   * 动态分配最优的Source
   * @param creep 要分配的creep
   * @param sources 可用的source列表
   * @param role 角色（用于统计当前分配情况）
   * @returns 分配的source对象
   */
  static assignOptimalSource(creep: Creep, sources: Array<Source>, role: string): Source | null {
    if (sources.length === 0) return null;

    // 生成source统计信息
    const sourceStats = this.generateSourceStats(sources, creep, role);

    // 找到最需要采集者的Source
    let optimalSource = sources[0];
    let maxDeficit = this.calculateDeficit(sourceStats[optimalSource.id]);

    for (let i = 1; i < sources.length; i++) {
      const currentDeficit = this.calculateDeficit(sourceStats[sources[i].id]);

      if (currentDeficit > maxDeficit) {
        optimalSource = sources[i];
        maxDeficit = currentDeficit;
      } else if (currentDeficit === maxDeficit) {
        // 如果缺口相同，选择距离Spawn更近的（优先发展近距离资源）
        if (sourceStats[sources[i].id].distance < sourceStats[optimalSource.id].distance) {
          optimalSource = sources[i];
        }
      }
    }

    // 保存分配结果到creep内存
    creep.memory.targetSourceId = optimalSource.id;
    const stat = sourceStats[optimalSource.id];
    console.log(`${role} ${creep.name} assigned to source ${optimalSource.id} (distance: ${stat.distance}, current: ${stat.current}, expected: ${stat.expected})`);

    return optimalSource;
  }

  /**
   * 生成Source统计信息
   * @param sources source列表
   * @param creep 当前creep（用于计算距离）
   * @param role 角色（用于统计当前分配情况）
   * @returns source统计信息映射表
   */
  static generateSourceStats(sources: Array<Source>, creep: Creep, role: string): { [sourceId: string]: { current: number; expected: number; distance: number } } {
    const sourceStats: { [sourceId: string]: { current: number; expected: number; distance: number } } = {};

    // 找到Spawn位置作为距离计算基准
    const spawnPos = this.getSpawnPosition();

    // 初始化统计数据
    for (const source of sources) {
      const distance = this.calculateDistance(spawnPos, source.pos);
      // 期望采集者数量计算公式：
      // expected = BASE_WORKERS + (distance / 10) * DISTANCE_FACTOR
      // 然后限制在MIN_WORKERS和MAX_WORKERS之间
      let expectedWorkers = Math.round(
        CommonConstant.SOURCE_BASE_WORKERS + (distance / 10) * CommonConstant.SOURCE_DISTANCE_FACTOR
      );
      expectedWorkers = Math.max(
        CommonConstant.SOURCE_MIN_WORKERS,
        Math.min(CommonConstant.SOURCE_MAX_WORKERS, expectedWorkers)
      );

      sourceStats[source.id] = {
        current: 0,
        expected: expectedWorkers,
        distance: distance
      };
    }

    // 统计当前各Source点的采集者数量
    for (const creepName in Game.creeps) {
      const currentCreep = Game.creeps[creepName];
      if (currentCreep.memory.role === role && currentCreep.memory.targetSourceId) {
        if (sourceStats[currentCreep.memory.targetSourceId]) {
          sourceStats[currentCreep.memory.targetSourceId].current++;
        }
      }
    }

    return sourceStats;
  }

  /**
   * 轮询分配Container
   * @param creep 要分配的creep
   * @param strategy 分配策略
   * @returns 分配的container对象
   */
  static assignContainerByStrategy(creep: Creep, strategy: ContainerAssignmentStrategy = ContainerAssignmentStrategy.ROUND_ROBIN): StructureContainer | null {
    const containers = this.findAvailableContainers(creep);
    if (containers.length === 0) return null;

    switch (strategy) {
      case ContainerAssignmentStrategy.NEAREST:
        return this.findNearestContainer(creep, containers);

      case ContainerAssignmentStrategy.ROUND_ROBIN:
        return this.assignContainerRoundRobin(creep, containers);

      case ContainerAssignmentStrategy.LOAD_BALANCE:
        return this.assignContainerByLoadBalance(creep, containers);

      default:
        return containers[0];
    }
  }

  /**
   * 轮询分配Container实现
   * @param creep 要分配的creep
   * @param containers 可用的container列表
   * @returns 分配的container对象
   */
  private static assignContainerRoundRobin(creep: Creep, containers: Array<StructureContainer>): StructureContainer {
    // 初始化房间级别的轮询索引
    if (!Game.rooms[creep.room.name].memory) {
      Game.rooms[creep.room.name].memory = {};
    }
    if (!Game.rooms[creep.room.name].memory.containerRoundRobinIndex) {
      Game.rooms[creep.room.name].memory.containerRoundRobinIndex = 0;
    }

    // 获取当前索引并分配container
    const roomMemory = Game.rooms[creep.room.name].memory as any;
    const currentIndex = roomMemory.containerRoundRobinIndex % containers.length;
    const assignedContainer = containers[currentIndex];

    // 更新索引供下次使用
    roomMemory.containerRoundRobinIndex = (currentIndex + 1) % containers.length;

    // 保存分配结果到creep内存
    creep.memory.targetContainerId = assignedContainer.id;
    console.log(`Carry ${creep.name} assigned to container ${assignedContainer.id} (round-robin index: ${currentIndex})`);

    return assignedContainer;
  }

  /**
   * 基于负载均衡分配Container
   * @param creep 要分配的creep
   * @param containers 可用的container列表
   * @returns 分配的container对象
   */
  private static assignContainerByLoadBalance(creep: Creep, containers: Array<StructureContainer>): StructureContainer {
    // 找到存储量最少的container（需要搬运的container）
    let targetContainer = containers[0];
    let minStoredEnergy = targetContainer.store[RESOURCE_ENERGY] || 0;

    for (let i = 1; i < containers.length; i++) {
      const storedEnergy = containers[i].store[RESOURCE_ENERGY] || 0;
      if (storedEnergy < minStoredEnergy) {
        targetContainer = containers[i];
        minStoredEnergy = storedEnergy;
      }
    }

    creep.memory.targetContainerId = targetContainer.id;
    return targetContainer;
  }

  /**
   * 找到最近的Container
   * @param creep 要查找的creep
   * @param containers container列表
   * @returns 最近的container对象
   */
  private static findNearestContainer(creep: Creep, containers: Array<StructureContainer>): StructureContainer {
    // 按距离排序
    containers.sort((a, b) => {
      const aDistance = this.calculateDistance(creep.pos, a.pos);
      const bDistance = this.calculateDistance(creep.pos, b.pos);
      return aDistance - bDistance;
    });

    return containers[0];
  }

  /**
   * 查找可用的Container（使用缓存）
   * @param creep 要查找的creep
   * @returns 可用的container列表
   */
  static findAvailableContainers(creep: Creep): Array<StructureContainer> {
    return GameCacheManager.getAvailableContainers(creep.room.name);
  }

  /**
   * 查找需要能量的Container（使用缓存）
   * @param creep 要查找的creep
   * @returns 需要能量的container列表
   */
  static findNeedyContainers(creep: Creep): Array<StructureContainer> {
    return GameCacheManager.getNeedyContainers(creep.room.name);
  }

  /**
   * 动态获取房间内所有的Source（使用缓存）
   * @param room 房间对象
   * @returns source列表
   */
  static getRoomSources(room: Room): Array<Source> {
    return GameCacheManager.getRoomSources(room.name);
  }

  /**
   * 动态获取房间内所有的Container（使用缓存）
   * @param room 房间对象
   * @returns container列表
   */
  static getRoomContainers(room: Room): Array<StructureContainer> {
    return GameCacheManager.getRoomContainers(room.name);
  }

  /**
   * 获取Spawn位置
   */
  private static getSpawnPosition(): RoomPosition {
    // 寻找第一个可用的Spawn
    for (const spawnName in Game.spawns) {
      const spawn = Game.spawns[spawnName];
      if (spawn && spawn.pos) {
        return spawn.pos;
      }
    }

    // 如果没有Spawn，返回中心位置作为备选
    return new RoomPosition(25, 25, Game.rooms[Object.keys(Game.rooms)[0]]?.name || '');
  }

  /**
   * 计算两个位置之间的曼哈顿距离
   */
  static calculateDistance(pos1: RoomPosition, pos2: RoomPosition): number {
    return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
  }

  /**
   * 计算采集者缺口数量
   * 正数表示缺少采集者，负数表示采集者过剩
   */
  private static calculateDeficit(stat: { current: number; expected: number; distance: number }): number {
    return stat.expected - stat.current;
  }

  /**
   * 按优先级排序结构体
   * @param structures 结构体列表
   * @param priority 优先级映射表
   * @param referencePos 参考位置（用于计算距离）
   * @returns 排序后的结构体列表
   */
  static sortByPriority(structures: Array<Structure>, priority: { [key: string]: number }, referencePos: RoomPosition): Array<Structure> {
    return structures.sort((a, b) => {
      // 获取类型优先级，未定义的类型优先级为Infinity
      const aPriority = priority[a.structureType] ?? Infinity;
      const bPriority = priority[b.structureType] ?? Infinity;

      // 先按类型优先级排序
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      // 优先级相同时按距离排序
      const aDistance = this.calculateDistance(referencePos, a.pos);
      const bDistance = this.calculateDistance(referencePos, b.pos);
      return aDistance - bDistance;
    });
  }
}