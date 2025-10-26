import { SourceUtils, ContainerAssignmentStrategy } from "../utils/SourceUtils";
import { CommonConstant } from "../common/CommonConstant";
import { CarryUtils } from "../utils/CarryUtils";

export class Carry {
  creep: Creep

  // 能量存储结构优先级映射表（withdraw目标），数字越小优先级越高
  withdrawPriority: { [key: string]: number } = {
    [STRUCTURE_CONTAINER]: 0,
    [STRUCTURE_STORAGE]: 1
  };

  // 能量接收建筑优先级映射表（transfer目标），数字越小优先级越高
  transferPriority: { [key: string]: number } = {
    [STRUCTURE_SPAWN]: 0,
    [STRUCTURE_EXTENSION]: 1,
    [STRUCTURE_TOWER]: 2,
    [STRUCTURE_STORAGE]: 3
  };

  constructor(creep: Creep) {
    this.creep = creep;
  }

  transport(sources?: Array<Source>) {
    if (this.creep.memory.working && this.creep.store.getUsedCapacity() == 0) {
      this.creep.memory.working = false;
      this.creep.say('🔄 withdraw');
    }
    if (!this.creep.memory.working && this.creep.store.getUsedCapacity() == this.creep.store.getCapacity()) {
      this.creep.memory.working = true;
      this.creep.say('📦 transfer');
    }

    if (this.creep.memory.working) {
      this.performTransfer();
    }
    else {
      this.performWithdraw();
    }
  }

  private performWithdraw() {
    // 获取固定分配的container
    const assignedContainer = this.getAssignedContainer();

    if (assignedContainer) {
      // 检查container是否有能量
      if (assignedContainer.store[RESOURCE_ENERGY] > 0) {
        // 有能量，尝试提取
        this.tryWithdrawFromContainer(assignedContainer);
      } else {
        // container为空，Carry处于空闲状态
        CarryUtils.smartWaiting(this.creep, true , '💤 no containers', `Carry ${this.creep.name} no available containers found`);
        console.log(`Carry ${this.creep.name} is waiting for container ${assignedContainer.id} to be filled`);
      }
      return;
    }

    // 如果没有分配的container，尝试寻找其他有能量的存储结构
    const targets = this.findAvailableStorageStructures();

    if (targets.length > 0) {
      // 使用SourceUtils的优先级排序方法
      const sortedTargets = SourceUtils.sortByPriority(targets, this.withdrawPriority, this.creep.pos);

      // 从最高优先级且最近的目标提取能量
      if (this.creep.withdraw(sortedTargets[0] as any, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
        this.creep.moveTo(sortedTargets[0], { visualizePathStyle: { stroke: '#ff8800' } });
      }
    } else {
      // 没有任何可用的能量源，处于空闲状态
      this.creep.say('💤 idle');
    }
  }

  private performTransfer() {
    // 查找所有需要能量的结构
    const targets = this.creep.room.find(FIND_STRUCTURES, {
      filter: structure => {
        // 只考虑有存储容量且需要能量的结构
        if ("store" in structure) {
          const store = structure as any;
          return store.store[RESOURCE_ENERGY] < store.store.getCapacity(RESOURCE_ENERGY);
        }
        return false;
      }
    });

    if (targets.length > 0) {
      // 使用SourceUtils的优先级排序方法
      const sortedTargets = SourceUtils.sortByPriority(targets, this.transferPriority, this.creep.pos);

      // 转移能量到最高优先级且最近的目标
      if (this.creep.transfer(sortedTargets[0] as any, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
        this.creep.moveTo(sortedTargets[0], { visualizePathStyle: { stroke: '#00ff88' } });
      }
    }
  }

  /**
   * 获取分配的Container，实现基于距离的动态分配策略
   * 距离远的Container需要更多Carry来维护
   * @returns 分配的Container对象或null
   */
  private getAssignedContainer(): StructureContainer | null {
    // 如果已有分配的目标container，保持该分配不变
    if (this.creep.memory.targetContainerId) {
      const existingContainer = Game.getObjectById(this.creep.memory.targetContainerId as Id<StructureContainer>);
      if (existingContainer) {
        // 即使container为空也继续等待，不重新分配
        return existingContainer;
      }
    }

    // 首次分配或重新分配时，使用动态算法
    return this.assignOptimalContainer();
  }

  /**
   * 动态分配最优的Container
   * 算法：考虑距离因素，距离远的 Container 需要更多 Carry 来维持物流平衡
   */
  private assignOptimalContainer(): StructureContainer | null {
    const availableContainers = SourceUtils.getRoomContainers(this.creep.room);
    if (availableContainers.length === 0) {
      return null;
    }

    // 生成container统计信息
    const containerStats = this.generateContainerStats(availableContainers);

    // 找到最需要Carry的Container
    let optimalContainer = availableContainers[0];
    let maxDeficit = this.calculateContainerDeficit(containerStats[optimalContainer.id]);

    for (let i = 1; i < availableContainers.length; i++) {
      const currentDeficit = this.calculateContainerDeficit(containerStats[availableContainers[i].id]);

      if (currentDeficit > maxDeficit) {
        optimalContainer = availableContainers[i];
        maxDeficit = currentDeficit;
      } else if (currentDeficit === maxDeficit) {
        // 如果缺口相同，选择距离Spawn更近的（优先发展近距离物流）
        if (containerStats[availableContainers[i].id].distance < containerStats[optimalContainer.id].distance) {
          optimalContainer = availableContainers[i];
        }
      }
    }

    // 分配最优Container
    this.creep.memory.targetContainerId = optimalContainer.id;
    const stat = containerStats[optimalContainer.id];
    console.log(`Carry ${this.creep.name} assigned to container ${optimalContainer.id} (distance: ${stat.distance}, current: ${stat.current}, expected: ${stat.expected})`);

    return optimalContainer;
  }

  /**
   * 生成Container统计信息
   * @param containers container列表
   * @returns container统计信息映射表
   */
  private generateContainerStats(containers: Array<StructureContainer>): { [containerId: string]: { current: number; expected: number; distance: number } } {
    const containerStats: { [containerId: string]: { current: number; expected: number; distance: number } } = {};

    // 找到Spawn位置作为距离计算基准
    const spawnPos = this.getSpawnPosition();

    // 初始化统计数据
    for (const container of containers) {
      const distance = SourceUtils.calculateDistance(spawnPos, container.pos);
      // 期望Carry数量计算公式：
      // expected = BASE_CARRIES + (distance / 10) * DISTANCE_FACTOR
      // 然后限制在MIN_CARRIES和MAX_CARRIES之间
      let expectedCarries = Math.round(
        CommonConstant.CONTAINER_BASE_WORKERS + (distance / 10) * CommonConstant.CONTAINER_DISTANCE_FACTOR
      );
      expectedCarries = Math.max(
        CommonConstant.CONTAINER_MIN_WORKERS,
        Math.min(CommonConstant.CONTAINER_MAX_WORKERS, expectedCarries)
      );

      containerStats[container.id] = {
        current: 0,
        expected: expectedCarries,
        distance: distance
      };
    }

    // 统计当前各Container点的Carry数量
    for (const creepName in Game.creeps) {
      const creep = Game.creeps[creepName];
      if (creep.memory.role === CommonConstant.CARRY && creep.memory.targetContainerId) {
        if (containerStats[creep.memory.targetContainerId]) {
          containerStats[creep.memory.targetContainerId].current++;
        }
      }
    }

    return containerStats;
  }

  /**
   * 获取Spawn位置
   */
  private getSpawnPosition(): RoomPosition {
    // 寻找第一个可用的Spawn
    for (const spawnName in Game.spawns) {
      const spawn = Game.spawns[spawnName];
      if (spawn && spawn.pos) {
        return spawn.pos;
      }
    }

    // 如果没有Spawn，返回当前creep的位置作为备选
    return this.creep.pos;
  }

  /**
   * 计算Carry缺口数量
   * 正数表示缺少Carry，负数表示Carry过剩
   */
  private calculateContainerDeficit(stat: { current: number; expected: number; distance: number }): number {
    return stat.expected - stat.current;
  }

  /**
   * 找到最近的Container
   * @param containers container列表
   * @returns 最近的container
   */
  private findNearestContainer(containers: Array<StructureContainer>): StructureContainer {
    let nearestContainer = containers[0];
    let minDistance = SourceUtils.calculateDistance(this.creep.pos, nearestContainer.pos);

    for (let i = 1; i < containers.length; i++) {
      const distance = SourceUtils.calculateDistance(this.creep.pos, containers[i].pos);
      if (distance < minDistance) {
        minDistance = distance;
        nearestContainer = containers[i];
      }
    }

    return nearestContainer;
  }

  /**
   * 尝试从指定Container提取能量
   * @param container 目标Container
   * @returns 是否成功开始提取操作
   */
  private tryWithdrawFromContainer(container: StructureContainer): boolean {
    if (this.creep.withdraw(container, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
      this.creep.moveTo(container, { visualizePathStyle: { stroke: '#ff8800' } });
    }
    return true;
  }

  /**
   * 查找可用的存储结构（除Container外）
   * @returns 可用的存储结构列表
   */
  private findAvailableStorageStructures(): Array<Structure> {
    return this.creep.room.find(FIND_STRUCTURES, {
      filter: structure => {
        // 排除Container，因为Container通过轮询策略处理
        if (structure.structureType === STRUCTURE_CONTAINER) {
          return false;
        }

        // 只考虑有存储容量且有能量的结构
        if ("store" in structure) {
          const store = structure as any;
          return store.store[RESOURCE_ENERGY] > 0;
        }
        return false;
      }
    });
  }
}
