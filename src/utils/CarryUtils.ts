import { SourceUtils } from "./SourceUtils";
import { WaitingPositionManager } from "./WaitingPositionManager";

export class CarryUtils {

  /**
   * 检查并更新creep的工作状态
   * @param creep 要检查的creep
   * @param emptyMessage 空闲状态时的消息
   * @param fullMessage 满载状态时的消息
   * @returns 当前工作状态（true表示需要transfer，false表示需要withdraw）
   */
  static checkWorkingState(creep: Creep, emptyMessage: string = '🔄 withdraw', fullMessage: string = '📦 transfer'): boolean {
    if (creep.memory.working && creep.store.getUsedCapacity() == 0) {
      creep.memory.working = false;
      creep.say(emptyMessage);
    }
    if (!creep.memory.working && creep.store.getUsedCapacity() == creep.store.getCapacity()) {
      creep.memory.working = true;
      creep.say(fullMessage);
    }
    return creep.memory.working;
  }

  /**
   * 移动到目标并执行withdraw操作
   * @param creep 执行操作的creep
   * @param target 目标结构
   * @param resource 资源类型（默认为能量）
   * @param pathStyle 移动路径样式
   * @returns 操作结果
   */
  static moveToAndWithdraw(creep: Creep, target: any, resource: ResourceConstant = RESOURCE_ENERGY, pathStyle?: any): ScreepsReturnCode {
    const result = creep.withdraw(target, resource);
    if (result === ERR_NOT_IN_RANGE) {
      creep.moveTo(target, { visualizePathStyle: pathStyle || { stroke: '#ff8800' } });
    }
    return result;
  }

  /**
   * 移动到目标并执行transfer操作
   * @param creep 执行操作的creep
   * @param target 目标结构
   * @param resource 资源类型（默认为能量）
   * @param pathStyle 移动路径样式
   * @returns 操作结果
   */
  static moveToAndTransfer(creep: Creep, target: any, resource: ResourceConstant = RESOURCE_ENERGY, pathStyle?: any): ScreepsReturnCode {
    const result = creep.transfer(target, resource);
    if (result === ERR_NOT_IN_RANGE) {
      creep.moveTo(target, { visualizePathStyle: pathStyle || { stroke: '#00ff88' } });
    }
    return result;
  }

  /**
   * 查找可用的存储结构
   * @param creep 搜索的creep
   * @param structureTypes 要搜索的结构类型数组
   * @param filterCondition 额外的过滤条件函数
   * @returns 找到的结构列表
   */
  static findAvailableStructures(creep: Creep, structureTypes: StructureConstant[], filterCondition?: (structure: any) => boolean): Structure[] {
    return creep.room.find(FIND_STRUCTURES, {
      filter: structure => {
        // 检查结构类型
        if (!structureTypes.includes(structure.structureType)) {
          return false;
        }

        // 检查是否有存储能力
        if (!("store" in structure)) {
          return false;
        }

        // 应用额外的过滤条件
        if (filterCondition && !filterCondition(structure)) {
          return false;
        }

        return true;
      }
    });
  }

  /**
   * 根据优先级排序结构列表
   * @param structures 要排序的结构列表
   * @param priorityMap 优先级映射表
   * @param referencePos 参考位置（用于距离计算）
   * @returns 排序后的结构列表
   */
  static sortStructuresByPriority(structures: Structure[], priorityMap: { [key: string]: number }, referencePos: RoomPosition): Structure[] {
    return SourceUtils.sortByPriority(structures, priorityMap, referencePos);
  }

  /**
   * 获取Spawn位置
   * @param creep 当前creep
   * @returns Spawn位置，如果没有Spawn则返回creep当前位置
   */
  static getSpawnPosition(creep: Creep): RoomPosition {
    // 寻找第一个可用的Spawn
    for (const spawnName in Game.spawns) {
      const spawn = Game.spawns[spawnName];
      if (spawn && spawn.pos) {
        return spawn.pos;
      }
    }

    // 如果没有Spawn，返回当前creep的位置作为备选
    return creep.pos;
  }

  /**
   * 计算结构能量百分比
   * @param structure 具有存储的结构
   * @returns 能量百分比（0-100）
   */
  static calculateEnergyPercentage(structure: any): number {
    if (!structure.store || typeof structure.store.getCapacity !== 'function') {
      return 0;
    }
    const capacity = structure.store.getCapacity(RESOURCE_ENERGY);
    const current = structure.store[RESOURCE_ENERGY] || 0;
    return capacity > 0 ? (current / capacity) * 100 : 0;
  }

  /**
   * 检查结构是否需要能量
   * @param structure 具有存储的结构
   * @param minCapacityPercent 最小容量百分比（默认0）
   * @returns 是否需要能量
   */
  static structureNeedsEnergy(structure: any, minCapacityPercent: number = 0): boolean {
    if (!structure.store || typeof structure.store.getCapacity !== 'function') {
      return false;
    }
    const capacity = structure.store.getCapacity(RESOURCE_ENERGY);
    const current = structure.store[RESOURCE_ENERGY] || 0;
    const threshold = capacity * (minCapacityPercent / 100);
    return current < (capacity - threshold);
  }

  /**
   * 检查结构是否有足够能量
   * @param structure 具有存储的结构
   * @param minAmount 最小能量数量
   * @returns 是否有足够能量
   */
  static structureHasEnergy(structure: any, minAmount: number = 0): boolean {
    if (!structure.store) {
      return false;
    }
    const current = structure.store[RESOURCE_ENERGY] || 0;
    return current >= minAmount;
  }

  /**
   * 获取creep的携带能量数量
   * @param creep 目标creep
   * @returns 携带的能量数量
   */
  static getCreepEnergyAmount(creep: Creep): number {
    return creep.store[RESOURCE_ENERGY] || 0;
  }

  /**
   * 获取creep的剩余容量
   * @param creep 目标creep
   * @returns 剩余容量
   */
  static getCreepFreeCapacity(creep: Creep): number {
    return creep.store.getFreeCapacity();
  }

  /**
   * 获取creep的已用容量
   * @param creep 目标creep
   * @returns 已用容量
   */
  static getCreepUsedCapacity(creep: Creep): number {
    return creep.store.getUsedCapacity();
  }

  /**
   * 检查creep是否已满载
   * @param creep 目标creep
   * @returns 是否满载
   */
  static isCreepFull(creep: Creep): boolean {
    return this.getCreepUsedCapacity(creep) === creep.store.getCapacity();
  }

  /**
   * 检查creep是否为空
   * @param creep 目标creep
   * @returns 是否为空
   */
  static isCreepEmpty(creep: Creep): boolean {
    return this.getCreepUsedCapacity(creep) === 0;
  }

  /**
   * 生成等待消息并记录日志
   * @param creep 目标creep
   * @param message 消息内容
   * @param logMessage 日志消息（可选）
   */
  static logWaitingState(creep: Creep, message: string, logMessage?: string): void {
    creep.say(message);
    if (logMessage) {
      console.log(logMessage);
    }
  }

  /**
   * 智能等待管理 - 移动到等待位置或原地等待
   * @param creep 目标creep
   * @param shouldWait 是否需要等待
   * @param message 等待消息
   * @param logMessage 日志消息
   * @param range 等待位置范围
   * @returns 是否正在等待
   */
  static smartWaiting(creep: Creep, shouldWait: boolean, message: string = '💤 waiting', logMessage?: string, range: number = 2): boolean {
    if (!shouldWait) {
      return false;
    }

    // 使用WaitingPositionManager进行智能等待
    const isWaiting = WaitingPositionManager.smartWait(creep, true, message, range);

    // 记录等待日志
    if (logMessage) {
      WaitingPositionManager.logWaitingState(creep, message, logMessage);
    }

    return isWaiting;
  }

  /**
   * 等待资源可用（带等待位置管理）
   * @param creep 目标creep
   * @param target 目标对象
   * @param checkFunction 检查函数，返回true表示资源可用
   * @param message 等待消息
   * @param logMessage 日志消息
   * @returns 资源是否可用
   */
  static waitForResourceAvailable(creep: Creep, target: any, checkFunction: (target: any) => boolean, message: string, logMessage?: string): boolean {
    if (checkFunction(target)) {
      return true; // 资源可用
    }

    // 资源不可用，进行智能等待
    this.smartWaiting(creep, true, message, logMessage);
    return false;
  }

  /**
   * 等待目标容量可用（带等待位置管理）
   * @param creep 目标creep
   * @param target 目标存储结构
   * @param message 等待消息
   * @param logMessage 日志消息
   * @returns 容量是否可用
   */
  static waitForCapacityAvailable(creep: Creep, target: any, message: string, logMessage?: string): boolean {
    if (this.structureNeedsEnergy(target)) {
      return true; // 容量可用
    }

    // 容量不可用，进行智能等待
    this.smartWaiting(creep, true, message, logMessage);
    return false;
  }

  /**
   * 检查Link是否需要能量（Link专用的能量检查）
   * @param link Link对象
   * @param threshold 阈值（0-1之间的百分比）
   * @returns 是否需要能量
   */
  static linkNeedsEnergy(link: StructureLink, threshold: number = 0.8): boolean {
    const currentEnergy = link.store.getUsedCapacity(RESOURCE_ENERGY);
    const maxEnergy = link.store.getCapacity(RESOURCE_ENERGY);
    const fillPercent = currentEnergy / maxEnergy;
    return fillPercent < threshold;
  }

  /**
   * 检查Link是否有足够能量可以提取
   * @param link Link对象
   * @param minEnergy 最小能量要求
   * @returns 是否有足够能量
   */
  static linkHasEnergy(link: StructureLink, minEnergy: number = 100): boolean {
    const currentEnergy = link.store.getUsedCapacity(RESOURCE_ENERGY);
    return currentEnergy >= minEnergy;
  }

  /**
   * 计算Link的能量填充百分比
   * @param link Link对象
   * @returns 填充百分比（0-1）
   */
  static getLinkFillPercent(link: StructureLink): number {
    const currentEnergy = link.store.getUsedCapacity(RESOURCE_ENERGY);
    const maxEnergy = link.store.getCapacity(RESOURCE_ENERGY);
    return currentEnergy / maxEnergy;
  }

  /**
   * 找到距离指定位置最近的Link
   * @param links Link列表
   * @param position 参考位置
   * @returns 最近的Link
   */
  static findNearestLink(links: StructureLink[], position: RoomPosition): StructureLink | null {
    if (links.length === 0) {
      return null;
    }

    let nearest = links[0];
    let minDistance = this.calculateDistance(position, nearest.pos);

    for (let i = 1; i < links.length; i++) {
      const distance = this.calculateDistance(position, links[i].pos);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = links[i];
      }
    }

    return nearest;
  }

  /**
   * 计算两个位置之间的曼哈顿距离
   * @param pos1 位置1
   * @param pos2 位置2
   * @returns 曼哈顿距离
   */
  static calculateDistance(pos1: RoomPosition, pos2: RoomPosition): number {
    return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
  }
}