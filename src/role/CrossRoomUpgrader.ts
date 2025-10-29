import { CreepUtils } from "../utils/CreepUtils";
import { GLOBAL_ALGORITHM_CONFIG, ROLE_NAMES } from "../config/GlobalConstants";
import { CrossRoomUtils } from "../utils/CrossRoomUtils";
import { RoomConfig } from "../types/RoomConfig";
import { ConfigLoader } from "../config/ConfigLoader";
import { SourceUtils } from "../utils/SourceUtils";

/**
 * 跨房间升级者 - 专门用于升级跨房间的Controller
 *
 * 特性：
 * - 身体配置：10MOVE + 8CARRY + 6WORK (平衡的移动性和工作能力)
 * - 专门升级Controller以提升RCL等级
 * - 当目标房间Spawn未建造完成时持续工作
 * - 从主房间装满能量后前往目标房间升级
 * - 智能判断何时停止升级（Spawn建成或达到目标RCL）
 */
export class CrossRoomUpgrader {
    creep: Creep;

    constructor(creep: Creep) {
        this.creep = creep;
    }

    /**
     * 主要工作方法
     */
    upgrade(): void {
        const targetRoom = this.getTargetRoom();
        if (!targetRoom) {
            console.log(`[CrossRoomUpgrader] ${this.creep.name} 没有目标房间，待命`);
            return;
        }

        // 检查是否应该停止工作
        if (this.shouldStopUpgrading(targetRoom)) {
            console.log(`[CrossRoomUpgrader] ${this.creep.name} 目标房间 ${targetRoom.roomName} 无需继续升级`);
            this.returnToHomeRoom();
            return;
        }

        // 检查是否在目标房间
        if (this.creep.room.name !== targetRoom.roomName) {
            // 前往目标房间
            this.moveToTargetRoom(targetRoom);
        } else {
            // 已在目标房间，执行升级逻辑
            this.performUpgradeTask(targetRoom);
        }
    }

    /**
     * 获取目标房间配置
     */
    private getTargetRoom(): { roomName: string; priority: number; targetRCL: number; currentRCL: number; active: boolean; stopWhenSpawnBuilt: boolean } | null {
        const homeRoom = this.creep.memory.homeRoom as string;
        if (!homeRoom) {
            console.log(`[CrossRoomUpgrader] ${this.creep.name} 没有设置homeRoom`);
            return null;
        }

        // 从房间配置中获取升级目标
        const roomConfig = this.getRoomConfig(homeRoom);
        if (!roomConfig?.crossRoomConfig?.upgradeTargets) {
            return null;
        }

        // 找到激活的升级目标
        const activeTargets = roomConfig.crossRoomConfig.upgradeTargets.filter(target =>
            target.active && target.currentRCL < target.targetRCL
        );

        if (activeTargets.length === 0) {
            return null;
        }

        // 按优先级排序
        activeTargets.sort((a, b) => a.priority - b.priority);
        return activeTargets[0];
    }

    /**
     * 判断是否应该停止升级
     */
    private shouldStopUpgrading(targetRoom: { roomName: string; stopWhenSpawnBuilt: boolean; targetRCL: number }): boolean {
        const room = Game.rooms[targetRoom.roomName];
        if (!room) {
            return false; // 无法访问房间，继续尝试
        }

        const controller = room.controller;
        if (!controller) {
            return true; // 没有控制器，停止
        }

        // 检查是否达到目标RCL
        if (controller.level >= targetRoom.targetRCL) {
            console.log(`[CrossRoomUpgrader] 房间 ${targetRoom.roomName} 已达到目标RCL ${targetRoom.targetRCL}`);
            return true;
        }

        // 检查是否在Spawn建成后停止
        if (targetRoom.stopWhenSpawnBuilt) {
            const spawns = room.find(FIND_MY_STRUCTURES, {
                filter: (s) => s.structureType === STRUCTURE_SPAWN
            });

            if (spawns.length > 0) {
                console.log(`[CrossRoomUpgrader] 房间 ${targetRoom.roomName} 已建成Spawn，停止升级`);
                return true;
            }
        }

        return false;
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
            console.log(`[CrossRoomUpgrader] ${this.creep.name} 无法找到到 ${targetRoom.roomName} 的路径`);
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
            console.log(`[CrossRoomUpgrader] ${this.creep.name} 在房间 ${this.creep.room.name} 中找不到Source`);
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
                if (this.creep.harvest(targetSource) === ERR_NOT_IN_RANGE) {
                    this.creep.moveTo(targetSource, { visualizePathStyle: { stroke: '#ffaa00' } });
                }
                this.creep.say('⛏️ harvesting');
            }
        } else {
            // 满载时停止采集，等待升级任务
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
        console.log(`[CrossRoomUpgrader] ${this.creep.name} 分配采集点: ${nearestSource.id}`);
    }

    /**
     * 执行升级任务
     */
    private performUpgradeTask(targetRoom: { roomName: string }): void {
        // 检查能量状态 - 只有完全没能量才去采集
        if (this.creep.memory.upgrading && this.creep.store.getUsedCapacity() === 0) {
            this.creep.memory.upgrading = false;
            this.creep.say('🔄 need energy');
            // 在目标房间采集能量，而不是返回主房间
            this.getEnergyFromSources();
            return;
        }

        // 满载时设置为升级模式
        if (!this.creep.memory.upgrading && this.creep.store.getUsedCapacity() >= this.creep.store.getCapacity()) {
            this.creep.memory.upgrading = true;
            this.creep.say('⚡ cross upgrade');
        }

        if (this.creep.memory.upgrading) {
            // 先检查是否真的需要继续工作（还有能量）
            if (this.creep.store.getUsedCapacity() === 0) {
                this.creep.memory.upgrading = false;
                this.creep.say('🔄 empty');
                return; // 能量耗尽，退出工作循环
            }

            const controller = this.creep.room.controller;
            if (!controller) {
                console.log(`[CrossRoomUpgrader] ${this.creep.name} 在房间 ${this.creep.room.name} 中找不到控制器`);
                return;
            }

            // 尝试升级控制器
            const result = this.creep.upgradeController(controller);

            if (result === ERR_NOT_IN_RANGE) {
                this.creep.moveTo(controller, { visualizePathStyle: { stroke: '#00ffff' } });
            } else if (result === OK) {
                this.creep.say('⚡ upgrading');
                // 升级成功，继续升级，不清除upgrading状态

                // 检查升级进度并更新配置
                this.checkUpgradeProgress(controller);
            } else if (result === ERR_NOT_ENOUGH_RESOURCES) {
                this.creep.say('❌ no energy');
                this.creep.memory.upgrading = false; // 只有在没有能量时才清除状态
            }
        }else {
          this.getEnergyFromSources();
        }
    }

    /**
     * 检查升级进度并更新配置
     */
    private checkUpgradeProgress(controller: StructureController): void {
        const homeRoom = this.creep.memory.homeRoom as string;
        const roomConfig = this.getRoomConfig(homeRoom);

        if (roomConfig?.crossRoomConfig?.upgradeTargets) {
            const upgradeTarget = roomConfig.crossRoomConfig.upgradeTargets.find(
                t => t.roomName === this.creep.room.name
            );

            if (upgradeTarget) {
                // 更新当前RCL
                upgradeTarget.currentRCL = controller.level;

                // 如果升级到了新的等级，记录日志
                if (upgradeTarget.currentRCL > upgradeTarget.currentRCL) {
                    console.log(`[CrossRoomUpgrader] ${this.creep.name} 将房间 ${this.creep.room.name} 升级到RCL ${controller.level}`);
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
            console.error(`[CrossRoomUpgrader] 获取房间 ${roomName} 配置失败:`, error);
            return null;
        }
    }

    /**
     * 检查是否应该继续工作
     */
    shouldContinueWorking(): boolean {
        // 检查是否还有升级目标
        const targetRoom = this.getTargetRoom();
        if (!targetRoom) {
            return false;
        }

        // 检查是否应该停止升级
        if (this.shouldStopUpgrading(targetRoom)) {
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

    /**
     * 获取升级效率统计
     */
    getUpgradeStats(): { totalUpgraded: number; currentRCL: number; progressToNext: number } {
        const controller = this.creep.room.controller;
        if (!controller) {
            return { totalUpgraded: 0, currentRCL: 0, progressToNext: 0 };
        }

        return {
            totalUpgraded: controller.progress || 0,
            currentRCL: controller.level,
            progressToNext: controller.progressTotal ? (controller.progress || 0) / controller.progressTotal : 0
        };
    }
}
