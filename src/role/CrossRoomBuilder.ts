import { CreepUtils } from "../utils/CreepUtils";
import { GLOBAL_ALGORITHM_CONFIG, ROLE_NAMES } from "../config/GlobalConstants";
import { CrossRoomUtils } from "../utils/CrossRoomUtils";
import { RoomConfig } from "../types/RoomConfig";
import { ConfigLoader } from "../config/ConfigLoader";
import { SourceUtils } from "../utils/SourceUtils";

/**
 * 跨房间建造者 - 专门用于建造属于我的Spawn
 *
 * 特性：
 * - 身体配置：12MOVE + 6CARRY + 6WORK (高移动性 + 足够建造能力)
 * - 专门建造跨房间的Spawn，然后是Extension等关键结构
 * - 从主房间装满能量后前往目标房间建造
 * - 建造完成后可选择返回或继续其他任务
 */
export class CrossRoomBuilder {
    creep: Creep;

    // 跨房间建造优先级 - Spawn最重要
    private readonly buildPriorities: { [key in BuildableStructureConstant]?: number } = GLOBAL_ALGORITHM_CONFIG.CROSS_ROOM_CONFIG.BUILD_PRIORITIES;

    constructor(creep: Creep) {
        this.creep = creep;
    }

    /**
     * 主要工作方法
     */
    build(): void {
        const targetRoom = this.getTargetRoom();
        if (!targetRoom) {
            console.log(`[CrossRoomBuilder] ${this.creep.name} 没有目标房间，待命`);
            return;
        }

        // 检查是否在目标房间
        if (this.creep.room.name !== targetRoom.roomName) {
            // 前往目标房间
            this.moveToTargetRoom(targetRoom);
        } else {
            // 已在目标房间，执行建造逻辑
            this.performBuildTask(targetRoom);
        }
    }

    /**
     * 获取目标房间配置
     */
    private getTargetRoom(): { roomName: string; priority: number; requiredStructures: StructureConstant[]; status: 'pending' | 'in_progress' | 'completed' } | null {
        const homeRoom = this.creep.memory.homeRoom as string;
        if (!homeRoom) {
            console.log(`[CrossRoomBuilder] ${this.creep.name} 没有设置homeRoom`);
            return null;
        }

        // 从房间配置中获取建造目标
        const roomConfig = this.getRoomConfig(homeRoom);
        if (!roomConfig?.crossRoomConfig?.buildTargets) {
            console.log(`[CrossRoomBuilder] ${this.creep.name} 房间 ${homeRoom} 没有建造目标配置`);
            return null;
        }
      for (let buildTarget of roomConfig.crossRoomConfig.buildTargets) {
        console.log(`[CrossRoomBuilder] buildTarget.status ${buildTarget.status}`);
      }
        // 找到第一个进行中或待处理的目标
        const availableTargets = roomConfig.crossRoomConfig.buildTargets.filter(target =>
            target.status === 'pending' || target.status === 'in_progress'
        );
        if (availableTargets.length === 0) {
            console.log(`[CrossRoomBuilder] ${this.creep.name} 房间 ${homeRoom} 没有可用的建造目标`);
            return null;
        }

        // 按优先级排序
        availableTargets.sort((a, b) => a.priority - b.priority);
        const selectedTarget = availableTargets[0];
        console.log(`[CrossRoomBuilder] ${this.creep.name} 选择了目标房间 ${selectedTarget.roomName} (优先级: ${selectedTarget.priority})`);

        return selectedTarget;
    }

    /**
     * 移动到目标房间
     */
    private moveToTargetRoom(targetRoom: { roomName: string }): void {
        const homeRoom = this.creep.memory.homeRoom as string;
        const currentRoom = this.creep.room.name;

        if (currentRoom === homeRoom) {
            // 在主房间：检查是否需要补充能量
            if (this.creep.store.getUsedCapacity() < this.creep.store.getCapacity() * 0.8) {
                this.refillEnergy();
                return;
            }
            // 能量充足，前往目标房间
        }

        // 移动到目标房间
        const result = CrossRoomUtils.moveToRoom(this.creep, targetRoom.roomName);
        if (result === ERR_NO_PATH) {
            console.log(`[CrossRoomBuilder] ${this.creep.name} 无法找到到 ${targetRoom.roomName} 的路径`);
        }
    }

    /**
     * 补充能量 - 在主房间从存储获取，在目标房间从Source采集
     */
    private refillEnergy(): void {
        if (this.creep.store.getFreeCapacity() === 0) {
            return; // 已经满载
        }

        const homeRoom = this.creep.memory.homeRoom as string;
        const isInHomeRoom = this.creep.room.name === homeRoom;

        if (isInHomeRoom) {
            // 在主房间：从存储结构获取能量
            this.getEnergyFromStorage();
        } else {
            // 在目标房间：从Source采集能量
            this.getEnergyFromSources();
        }
    }

    /**
     * 从存储结构获取能量（主房间专用）
     */
    private getEnergyFromStorage(): void {
        // 尝试从Storage获取能量
        const storage = this.creep.room.storage;
        if (storage && storage.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
            const result = this.creep.withdraw(storage, RESOURCE_ENERGY);
            if (result === ERR_NOT_IN_RANGE) {
                this.creep.moveTo(storage);
            } else if (result === OK) {
                this.creep.say('⚡ loading');
            }
            return;
        }

        // 尝试从Container获取能量
        const containers = this.creep.room.find(FIND_STRUCTURES, {
            filter: (s): s is StructureContainer =>
                s.structureType === STRUCTURE_CONTAINER &&
                s.store.getUsedCapacity(RESOURCE_ENERGY) > 0
        });

        if (containers.length > 0) {
            const container = containers[0];
            const result = this.creep.withdraw(container, RESOURCE_ENERGY);
            if (result === ERR_NOT_IN_RANGE) {
                this.creep.moveTo(container);
            } else if (result === OK) {
                this.creep.say('⚡ loading');
            }
            return;
        }

        // 如果主房间也没有存储，则从Source采集
        this.getEnergyFromSources();
    }

    /**
     * 从Source采集能量（参考Harvester方式）
     */
    private getEnergyFromSources(): void {
        const sources = this.creep.room.find(FIND_SOURCES);
        if (sources.length === 0) {
            console.log(`[CrossRoomBuilder] ${this.creep.name} 在房间 ${this.creep.room.name} 中找不到Source`);
            return;
        }

        // 如果没有目标采集点，分配一个最优的采集点
        if (!this.creep.memory.targetSourceId) {
            this.assignOptimalSource(sources);
        }

        // 获取目标采集点
        let targetSource = Game.getObjectById(this.creep.memory.targetSourceId as Id<Source>);

        // 如果目标采集点不存在，重新分配
        if (!targetSource) {
            this.assignOptimalSource(sources);
            targetSource = Game.getObjectById(this.creep.memory.targetSourceId as Id<Source>);
        }

        if (this.creep.store.getUsedCapacity() < this.creep.store.getCapacity()) {
            // 前往目标采集点采集资源
            if (targetSource) {
                // 检查当前采集点是否还有能量
                if (targetSource.energy === 0) {
                    console.log(`[CrossRoomBuilder] ${this.creep.name} 当前采集点 ${targetSource.id} 能量耗尽，切换采集点`);

                    // 寻找其他有能量的采集点
                    const availableSources = sources.filter(source => source.energy > 0);

                    if (availableSources.length > 0) {
                        // 重新分配有能量的采集点
                        this.assignOptimalSource(availableSources);
                        targetSource = Game.getObjectById(this.creep.memory.targetSourceId as Id<Source>);
                        console.log(`[CrossRoomBuilder] ${this.creep.name} 切换到新采集点: ${targetSource?.id}`);
                    } else {
                        // 所有采集点都没有能量，等待能量恢复
                        this.creep.say('⏳ waiting');
                        return;
                    }
                }

                if (targetSource && this.creep.harvest(targetSource) === ERR_NOT_IN_RANGE) {
                    this.creep.moveTo(targetSource, { visualizePathStyle: { stroke: '#ffaa00' } });
                }
                this.creep.say('⛏️ harvesting');
            }
        } else {
            // 满载时停止采集，等待建造任务
            this.creep.say('✅ full');
        }
    }

    /**
     * 分配最优的采集点（参考Harvester）
     */
    private assignOptimalSource(sources: Array<Source>): void {
        // 简单的距离优先分配，可以后续优化为更复杂的算法
        let nearestSource = sources[0];
        let minDistance = this.creep.pos.getRangeTo(nearestSource.pos);

        for (const source of sources) {
            const distance = this.creep.pos.getRangeTo(source.pos);
            if (distance < minDistance) {
                minDistance = distance;
                nearestSource = source;
            }
        }

        this.creep.memory.targetSourceId = nearestSource.id;
        console.log(`[CrossRoomBuilder] ${this.creep.name} 分配采集点: ${nearestSource.id}`);
    }

    /**
     * 执行建造任务
     */
    private performBuildTask(targetRoom: { roomName: string }): void {
        // 首先检查Spawn是否已经建成（可能被其他creep建成）
        if (this.isSpawnAlreadyBuilt()) {
            this.updateTaskStatusToCompleted();
            console.log(`[CrossRoomBuilder] ${this.creep.name} 发现房间 ${this.creep.room.name} 的Spawn已经建成，更新任务状态`);
            return;
        }

        // 检查能量状态 - 只有完全没能量才去采集
        if (this.creep.memory.building && this.creep.store.getUsedCapacity() === 0) {
            this.creep.memory.building = false;
            this.creep.say('🔄 need energy');
            // 在目标房间采集能量，而不是返回主房间
            this.getEnergyFromSources();
            return;
        }

        // 满载时设置为建造模式
        if (!this.creep.memory.building && this.creep.store.getUsedCapacity() >= this.creep.store.getCapacity()) {
            this.creep.memory.building = true;
            this.creep.say('🚧 cross build');
        }

        if (this.creep.memory.building) {

            // 查找建造目标
            const targets = this.findPriorityBuildTargets();

            if (targets.length > 0) {
                const target = targets[0];
                const result = this.creep.build(target);

                if (result === ERR_NOT_IN_RANGE) {
                    this.creep.moveTo(target, { visualizePathStyle: { stroke: '#00ff00' } });
                } else if (result === OK) {
                    this.creep.say('🚧 building');
                    // 建造成功，继续查找下一个目标，不清除building状态

                    // 检查是否完成了重要结构的建造
                    this.checkBuildCompletion(target);
                } else if (result === ERR_INVALID_TARGET) {
                    // 建筑位点可能已经完成
                    console.log(`[CrossRoomBuilder] ${this.creep.name} 建筑位点无效，检查Spawn是否建成`);
                    if (this.isSpawnAlreadyBuilt()) {
                        this.updateTaskStatusToCompleted();
                    }
                }
            } else {
                // 没有建造目标，再次检查Spawn是否建成
                if (this.isSpawnAlreadyBuilt()) {
                    this.updateTaskStatusToCompleted();
                } else {
                    // 没有建造目标，检查是否需要修复
                    const repairTargets = this.findRepairTargets();
                    if (repairTargets.length > 0) {
                        const target = repairTargets[0];
                        const result = this.creep.repair(target);

                        if (result === ERR_NOT_IN_RANGE) {
                            this.creep.moveTo(target, { visualizePathStyle: { stroke: '#ffff00' } });
                        } else if (result === OK) {
                            this.creep.say('🔧 repairing');
                            // 修复成功，继续工作，不清除building状态
                        }
                    } else {
                        // 没有工作目标，等待新任务，但不清除building状态
                        this.creep.say('🔍 waiting');
                    }
                }
            }
        }else {
          this.getEnergyFromSources();
        }
    }

    /**
     * 检查Spawn是否已经建成
     */
    private isSpawnAlreadyBuilt(): boolean {
        const spawns = this.creep.room.find(FIND_MY_STRUCTURES, {
            filter: (s) => s.structureType === STRUCTURE_SPAWN
        });
        return spawns.length > 0;
    }

    /**
     * 更新任务状态为完成
     */
    private updateTaskStatusToCompleted(): void {
        const homeRoom = this.creep.memory.homeRoom as string;
        const roomConfig = this.getRoomConfig(homeRoom);

        if (roomConfig?.crossRoomConfig?.buildTargets) {
            const buildTarget = roomConfig.crossRoomConfig.buildTargets.find(
                t => t.roomName === this.creep.room.name
            );

            if (buildTarget && buildTarget.status !== 'completed') {
                buildTarget.status = 'completed';
                console.log(`[CrossRoomBuilder] ${this.creep.name} 更新房间 ${this.creep.room.name} 建造任务为完成状态`);
            }
        }
    }

    /**
     * 查找优先级最高的建造目标
     */
    private findPriorityBuildTargets(): ConstructionSite[] {
        const targets = this.creep.room.find(FIND_CONSTRUCTION_SITES);

        if (targets.length === 0) {
            return [];
        }

        // 按照配置的优先级排序
        targets.sort((a, b) => {
            const aPriority = this.buildPriorities[a.structureType] ?? 999;
            const bPriority = this.buildPriorities[b.structureType] ?? 999;

            if (aPriority !== bPriority) {
                return aPriority - bPriority;
            }

            // 优先级相同时按距离排序
            const aDistance = this.creep.pos.getRangeTo(a.pos);
            const bDistance = this.creep.pos.getRangeTo(b.pos);
            return aDistance - bDistance;
        });

        return targets;
    }

    /**
     * 查找需要修复的结构
     */
    private findRepairTargets(): Structure[] {
        const structures = this.creep.room.find(FIND_STRUCTURES, {
            filter: (s) => {
                // 只修复重要结构且损坏严重的
                return (s.structureType === STRUCTURE_SPAWN ||
                       s.structureType === STRUCTURE_EXTENSION ||
                       s.structureType === STRUCTURE_CONTAINER) &&
                       s.hits < s.hitsMax * 0.8; // 损坏超过20%
            }
        });

        return structures;
    }

    /**
     * 检查建造完成情况
     */
    private checkBuildCompletion(target: ConstructionSite): void {
        // 只有当建造的是Spawn时才检查
        if (target.structureType !== STRUCTURE_SPAWN) {
            return;
        }

        // 检查是否真的建成了Spawn（查找已建成的Spawn）
        const spawns = this.creep.room.find(FIND_MY_STRUCTURES, {
            filter: (s) => s.structureType === STRUCTURE_SPAWN
        });

        if (spawns.length > 0) {
            // Spawn真的建成了，更新任务状态
            const homeRoom = this.creep.memory.homeRoom as string;
            const roomConfig = this.getRoomConfig(homeRoom);

            if (roomConfig?.crossRoomConfig?.buildTargets) {
                const buildTarget = roomConfig.crossRoomConfig.buildTargets.find(
                    t => t.roomName === this.creep.room.name
                );

                if (buildTarget && buildTarget.status !== 'completed') {
                    buildTarget.status = 'completed';
                    console.log(`[CrossRoomBuilder] ${this.creep.name} 真的完成了房间 ${this.creep.room.name} 的Spawn建造！`);
                }
            }
        }
    }

    /**
     * 返回主房间补充能量
     */
    private returnToHomeRoom(): void {
        const homeRoom = this.creep.memory.homeRoom as string;
        if (this.creep.room.name !== homeRoom) {
            CrossRoomUtils.moveToRoom(this.creep, homeRoom);
        }
    }

    /**
     * 获取房间配置
     */
    private getRoomConfig(roomName: string): RoomConfig | null {
        try {
            // 使用ConfigLoader获取房间配置
            const configLoader = ConfigLoader.getInstance();
            const room = Game.rooms[roomName];
            return configLoader.getRoomConfig(roomName, room);
        } catch (error) {
            console.error(`[CrossRoomBuilder] 获取房间 ${roomName} 配置失败:`, error);
            return null;
        }
    }

    /**
     * 检查是否应该继续工作
     */
    shouldContinueWorking(): boolean {
        // 检查是否还有建造目标
        const targetRoom = this.getTargetRoom();
        if (!targetRoom) {
            return false;
        }

        // 检查剩余寿命
        const remainingTicks = this.creep.ticksToLive || 0;
        const estimatedTravelTime = CrossRoomUtils.estimateTravelTime(
            this.creep.pos,
            targetRoom.roomName
        );

        return remainingTicks > estimatedTravelTime + 100; // 预留100tick缓冲
    }
}
