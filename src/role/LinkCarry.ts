import { CommonConstant } from "../common/CommonConstant";
import { CreepUtils } from "../utils/CreepUtils";
import { LinkManager } from "../manager/LinkManager";
import { GLOBAL_ALGORITHM_CONFIG } from "../config/GlobalConstants";

export class LinkCarry {
  creep: Creep
  private linkManager: LinkManager;

  // 提取优先级 - 只从Link提取
  withdrawPriority: { [structureType: string]: number } = {
    [STRUCTURE_LINK]: 0
  };

  // 转移优先级 - 主要转移到Storage
  transferPriority: { [structureType: string]: number } = {
    [STRUCTURE_STORAGE]: 3,
    [STRUCTURE_SPAWN]: 0,
    [STRUCTURE_EXTENSION]: 1,
    [STRUCTURE_TOWER]: 2
  };

  constructor(creep: Creep) {
    this.creep = creep;
    this.linkManager = LinkManager.getInstance();
  }

  /**
   * 主运输逻辑
   * 专门负责从Link提取能量到Storage
   * 如果Link为空，则充当普通Carry
   */
  transport(sources?: Array<Source>) {
    // 检查工作状态
    if (this.creep.memory.working && this.creep.store.getUsedCapacity() == 0) {
      this.creep.memory.working = false;
      this.creep.say('🔄 withdraw');
    }
    if (!this.creep.memory.working && this.creep.store.getUsedCapacity() == this.creep.store.getCapacity()) {
      this.creep.memory.working = true;
      this.creep.say('📦 transfer');
    }

    if (this.creep.memory.working) {
      // 工作状态：转移能量到目标结构
      this.performTransfer();
    } else {
      // 非工作状态：从Link提取能量或充当普通Carry
      const hasLinkEnergy = this.performWithdrawFromLink();

      if (!hasLinkEnergy) {
        // Link为空，充当普通Carry
        this.performWithdrawAsNormalCarry();
      }
    }
  }

  /**
   * 从Link提取能量
   * @returns 是否成功从Link提取到能量
   */
  private performWithdrawFromLink(): boolean {
    const roomName = this.creep.room.name;

    // 获取需要搬运的Link列表
    const linksNeedingCarry = this.linkManager.getLinksNeedingCarry(roomName);

    if (linksNeedingCarry.length === 0) {
      return false; // 没有需要搬运的Link
    }

    // 找到最优的Link（基于距离和能量）
    const optimalLink = this.findOptimalLink(linksNeedingCarry);

    if (!optimalLink) {
      return false;
    }

    // 提取能量
    const result = this.creep.withdraw(optimalLink, RESOURCE_ENERGY);

    if (result === OK) {
      console.log(`LinkCarry ${this.creep.name} withdrew energy from link ${optimalLink.id}`);
      return true;
    } else if (result === ERR_NOT_IN_RANGE) {
      this.creep.moveTo(optimalLink, { visualizePathStyle: { stroke: '#ff00ff' } });
      return true; // 正在前往Link
    } else {
      console.log(`LinkCarry ${this.creep.name} failed to withdraw from link: ${result}`);
      return false;
    }
  }

  /**
   * 找到最优的Link进行提取
   * @param links 候选Link列表
   * @returns 最优的Link
   */
  private findOptimalLink(links: StructureLink[]): StructureLink | null {
    if (links.length === 0) {
      return null;
    }

    if (links.length === 1) {
      return links[0];
    }

    // 计算每个Link的优先级分数
    const linkScores = links.map(link => {
      const distance = this.calculateDistance(this.creep.pos, link.pos);
      const energy = link.store.getUsedCapacity(RESOURCE_ENERGY);

      // 优先级计算：能量多 + 距离近
      // 距离权重更高，确保就近原则
      const score = energy - distance * 10;

      return { link, score, distance, energy };
    });

    // 按分数排序，选择最优的
    linkScores.sort((a, b) => b.score - a.score);

    return linkScores[0].link;
  }

  /**
   * 作为普通Carry提取能量
   * 当Link为空时使用
   */
  private performWithdrawAsNormalCarry(): void {
    // 从Container或Storage提取能量
    const targets = this.creep.room.find(FIND_STRUCTURES, {
      filter: structure => {
        if (structure.structureType === STRUCTURE_STORAGE) {

          const store = structure as any;
          return store.store.getUsedCapacity(RESOURCE_ENERGY) >
                 this.creep.store.getFreeCapacity(RESOURCE_ENERGY);
        }
        return false;
      }
    });

    if (targets.length > 0) {
      // 找到最近的目标
      const nearestTarget = this.findNearestTarget(targets);

      if (nearestTarget) {
        const result = this.creep.withdraw(nearestTarget, RESOURCE_ENERGY);
        if (result === ERR_NOT_IN_RANGE) {
          this.creep.moveTo(nearestTarget, { visualizePathStyle: { stroke: '#ffaa00' } });
        }
      }
    }
  }

  /**
   * 执行能量转移
   */
  private performTransfer(): void {
    // 优先转移到Storage
    let target = this.findTransferTarget();

    if (target) {
      const result = this.creep.transfer(target, RESOURCE_ENERGY);
      if (result === ERR_NOT_IN_RANGE) {
        this.creep.moveTo(target, { visualizePathStyle: { stroke: '#ffffff' } });
      } else if (result !== OK) {
        console.log(`LinkCarry ${this.creep.name} transfer failed: ${result}`);
      }
    } else {
      // 没有找到转移目标，等待或移动到Storage附近
      this.waitNearStorage();
    }
  }

  /**
   * 找到转移目标
   * @returns 转移目标结构
   */
  private findTransferTarget(): AnyStructure | null {
    const targets = this.creep.room.find(FIND_STRUCTURES, {
      filter: structure => {
        // 检查结构是否有存储容量且需要能量
        if (!("store" in structure)) {
          return false;
        }

        const store = structure as any;
        const currentEnergy = store.store.getUsedCapacity(RESOURCE_ENERGY);
        const maxEnergy = store.store.getCapacity(RESOURCE_ENERGY);

        // 只考虑需要能量的结构
        return currentEnergy < maxEnergy;
      }
    });

    if (targets.length === 0) {
      return null;
    }

    // 按优先级排序
    const sortedTargets = targets.sort((a, b) => {
      const priorityA = this.transferPriority[a.structureType] ?? 999;
      const priorityB = this.transferPriority[b.structureType] ?? 999;

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // 优先级相同时按距离排序
      const distanceA = this.calculateDistance(this.creep.pos, a.pos);
      const distanceB = this.calculateDistance(this.creep.pos, b.pos);
      return distanceA - distanceB;
    });

    return sortedTargets[0];
  }

  /**
   * 找到最近的目标
   * @param targets 目标列表
   * @returns 最近的目
   */
  private findNearestTarget(targets: AnyStructure[]): AnyStructure | null {
    if (targets.length === 0) {
      return null;
    }

    let nearest = targets[0];
    let minDistance = this.calculateDistance(this.creep.pos, nearest.pos);

    for (let i = 1; i < targets.length; i++) {
      const distance = this.calculateDistance(this.creep.pos, targets[i].pos);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = targets[i];
      }
    }

    return nearest;
  }

  /**
   * 在Storage附近等待
   */
  private waitNearStorage(): void {
    const storage = this.creep.room.find<StructureStorage>(FIND_MY_STRUCTURES, {
      filter: structure => structure.structureType === STRUCTURE_STORAGE
    })[0];

    if (storage) {
      // 移动到Storage附近但不阻挡
      const waitPos = this.findWaitPosition(storage.pos);
      if (waitPos && !this.creep.pos.isEqualTo(waitPos.x, waitPos.y)) {
        this.creep.moveTo(waitPos.x, waitPos.y, { visualizePathStyle: { stroke: '#ffff00' } });
      }
    }
  }

  /**
   * 找到等待位置
   * @param centerPos 中心位置
   * @returns 等待位置
   */
  private findWaitPosition(centerPos: RoomPosition): RoomPosition | null {
    const radius = GLOBAL_ALGORITHM_CONFIG.WAITING_POSITION_CONFIG.DEFAULT_DISTANCE;

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const x = centerPos.x + dx;
        const y = centerPos.y + dy;

        // 检查位置是否有效
        if (x < 0 || x >= 50 || y < 0 || y >= 50) {
          continue;
        }

        // 检查地形是否可行走
        const terrain = this.creep.room.getTerrain().get(x, y);
        if (terrain === TERRAIN_MASK_WALL) {
          continue;
        }

        // 检查位置是否有其他creep
        const creepsAtPos = this.creep.room.lookForAt(LOOK_CREEPS, x, y);
        if (creepsAtPos.length > 0) {
          continue;
        }

        return new RoomPosition(x, y, this.creep.room.name);
      }
    }

    return null;
  }

  /**
   * 计算两个位置之间的曼哈顿距离
   * @param pos1 位置1
   * @param pos2 位置2
   * @returns 曼哈顿距离
   */
  private calculateDistance(pos1: RoomPosition, pos2: RoomPosition): number {
    return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
  }

  /**
   * 检查是否有Link需要搬运
   * @returns 是否有Link需要搬运
   */
  public hasWorkAvailable(): boolean {
    const roomName = this.creep.room.name;
    const linksNeedingCarry = this.linkManager.getLinksNeedingCarry(roomName);
    return linksNeedingCarry.length > 0;
  }
}
