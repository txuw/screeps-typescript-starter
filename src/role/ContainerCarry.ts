import { SourceUtils } from "../utils/SourceUtils";
import { CarryUtils } from "../utils/CarryUtils";
import { CommonConstant } from "../common/CommonConstant";

export class ContainerCarry {
  creep: Creep

  // 能量存储结构优先级映射表（withdraw目标），数字越小优先级越高
  withdrawPriority: { [key: string]: number } = {
    [STRUCTURE_CONTAINER]: 0
  };

  // 能量接收建筑优先级映射表（transfer目标），数字越小优先级越高
  transferPriority: { [key: string]: number } = {
    [STRUCTURE_STORAGE]: 0
  };

  constructor(creep: Creep) {
    this.creep = creep;
  }

  transport(sources?: Array<Source>) {
    const isWorking = CarryUtils.checkWorkingState(this.creep, '🔄 withdraw', '📦 toStorage');

    if (isWorking) {
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
      if (CarryUtils.waitForResourceAvailable(
        this.creep,
        assignedContainer,
        (container) => CarryUtils.structureHasEnergy(container, 1),
        '💤 container empty',
        `ContainerCarry ${this.creep.name} waiting for container ${assignedContainer.id} to be filled`
      )) {
        // 有能量，尝试提取
        this.tryWithdrawFromContainer(assignedContainer);
      }
      return;
    }

    // 如果没有分配的container，尝试寻找其他有能量的container
    const targets = this.findAvailableContainers();

    if (targets.length > 0) {
      // 使用工具类排序方法
      const sortedTargets = CarryUtils.sortStructuresByPriority(targets, this.withdrawPriority, this.creep.pos);

      // 从最高优先级且最近的目标提取能量
      CarryUtils.moveToAndWithdraw(this.creep, sortedTargets[0]);
    } else {
      // 没有任何可用的能量源，进行智能等待
      CarryUtils.smartWaiting(
        this.creep,
        true,
        '💤 no containers',
        `ContainerCarry ${this.creep.name} no available containers found`
      );
    }
  }

  private performTransfer() {
    // 查找Storage作为唯一目标
    const storages = CarryUtils.findAvailableStructures(
      this.creep,
      [STRUCTURE_STORAGE],
      (structure) => CarryUtils.structureNeedsEnergy(structure)
    );

    if (storages.length > 0) {
      CarryUtils.moveToAndTransfer(this.creep, storages[0]);
    } else {
      // 如果没有Storage或Storage已满，进行智能等待
      CarryUtils.smartWaiting(
        this.creep,
        true,
        '⏳ wait storage',
        `ContainerCarry ${this.creep.name} waiting for available storage`
      );
    }
  }

  /**
   * 获取分配的Container，实现基于距离的动态分配策略
   * 距离远的Container需要更多ContainerCarry来维护
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
   * 算法：考虑距离因素，距离远的 Container 需要更多 ContainerCarry 来维持物流平衡
   */
  private assignOptimalContainer(): StructureContainer | null {
    const availableContainers = SourceUtils.getRoomContainers(this.creep.room);
    if (availableContainers.length === 0) {
      return null;
    }

    // 生成container统计信息
    const containerStats = this.generateContainerStats(availableContainers);

    // 找到最需要ContainerCarry的Container
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
    console.log(`ContainerCarry ${this.creep.name} assigned to container ${optimalContainer.id} (distance: ${stat.distance}, current: ${stat.current}, expected: ${stat.expected})`);

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
    const spawnPos = CarryUtils.getSpawnPosition(this.creep);

    // 初始化统计数据
    for (const container of containers) {
      const distance = SourceUtils.calculateDistance(spawnPos, container.pos);
      // 期望ContainerCarry数量计算公式：
      // expected = BASE_WORKERS + (distance / 10) * DISTANCE_FACTOR
      // 然后限制在MIN_WORKERS和MAX_WORKERS之间
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

    // 统计当前各Container点的ContainerCarry数量
    for (const creepName in Game.creeps) {
      const creep = Game.creeps[creepName];
      if (creep.memory.role === CommonConstant.CONTAINER_CARRY && creep.memory.targetContainerId) {
        if (containerStats[creep.memory.targetContainerId]) {
          containerStats[creep.memory.targetContainerId].current++;
        }
      }
    }

    return containerStats;
  }

  
  /**
   * 计算ContainerCarry缺口数量
   * 正数表示缺少ContainerCarry，负数表示ContainerCarry过剩
   */
  private calculateContainerDeficit(stat: { current: number; expected: number; distance: number }): number {
    return stat.expected - stat.current;
  }

  /**
   * 尝试从指定Container提取能量
   * @param container 目标Container
   * @returns 是否成功开始提取操作
   */
  private tryWithdrawFromContainer(container: StructureContainer): boolean {
    CarryUtils.moveToAndWithdraw(this.creep, container);
    return true;
  }

  /**
   * 查找可用的Container
   * @returns 可用的Container列表
   */
  private findAvailableContainers(): Array<Structure> {
    return CarryUtils.findAvailableStructures(
      this.creep,
      [STRUCTURE_CONTAINER],
      (structure) => CarryUtils.structureHasEnergy(structure, 1)
    );
  }
}