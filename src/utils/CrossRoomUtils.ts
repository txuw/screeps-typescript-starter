import { GLOBAL_ALGORITHM_CONFIG } from '../config/GlobalConstants';

/**
 * 跨房间通用工具函数
 * 为CrossRoomBuilder和CrossRoomUpgrader提供通用功能
 */
export class CrossRoomUtils {
    /**
     * 移动到指定房间
     * @param creep Creep对象
     * @param roomName 目标房间名称
     * @returns 移动结果
     */
    static moveToRoom(creep: Creep, roomName: string): ScreepsReturnCode {
        // 检查是否已经在目标房间
        if (creep.room.name === roomName) {
            return OK;
        }

        // 使用Game.map.findRoomByRoomName检查房间是否存在
        if (!Game.map.getRoomStatus(roomName)) {
            return ERR_INVALID_TARGET;
        }

        // 寻找到目标房间的路径
        const route = Game.map.findRoute(creep.room.name, roomName);
        if (route === ERR_NO_PATH) {
            return ERR_NO_PATH;
        }

        if (route.length === 0) {
            return OK; // 已经在目标房间
        }

        // 获取路径中的下一个房间
        const nextRoom = route[0].room;

        // 使用内置的跨房间移动逻辑
        const result = creep.moveTo(new RoomPosition(25, 25, nextRoom));
        return result;
    }

    /**
     * 估算移动到目标房间需要的时间（tick数）
     * @param currentPos 当前位置
     * @param targetRoomName 目标房间名称
     * @returns 估算的移动时间
     */
    static estimateTravelTime(currentPos: RoomPosition, targetRoomName: string): number {
        // 计算房间间距离
        const currentRoom = currentPos.roomName;
        const route = Game.map.findRoute(currentRoom, targetRoomName);

        if (route === ERR_NO_PATH) {
            return Infinity;
        }

        // 基础移动时间：房间数 * 50（假设跨房间移动平均需要50tick）
        const baseTime = route.length * 50;

        // 房间内移动时间：假设平均需要20tick
        const intraRoomTime = 20;

        return baseTime + intraRoomTime;
    }

    /**
     * 生成跨房间Builder身体配置
     * @param energyLimit 能量限制
     * @returns 身体部件数组
     */
    static generateCrossRoomBuilderBody(energyLimit: number): BodyPartConstant[] {
        const body: BodyPartConstant[] = [];
        const config = GLOBAL_ALGORITHM_CONFIG.CROSS_ROOM_CONFIG.BUILDER_BODY;
        let totalCost = 0;

        // 计算总成本
        const totalRequiredCost =
            BODYPART_COST[MOVE] * config.MOVE +
            BODYPART_COST[CARRY] * config.CARRY +
            BODYPART_COST[WORK] * config.WORK;

        // 如果能量不足，按比例缩减
        if (energyLimit < totalRequiredCost) {
            const scale = energyLimit / totalRequiredCost;

            // 按比例添加MOVE部件
            const moveCount = Math.max(1, Math.floor(config.MOVE * scale));
            for (let i = 0; i < moveCount; i++) {
                body.push(MOVE);
            }

            // 按比例添加CARRY部件
            const carryCount = Math.max(1, Math.floor(config.CARRY * scale));
            for (let i = 0; i < carryCount; i++) {
                body.push(CARRY);
            }

            // 按比例添加WORK部件
            const workCount = Math.max(1, Math.floor(config.WORK * scale));
            for (let i = 0; i < workCount; i++) {
                body.push(WORK);
            }
        } else {
            // 完整配置
            for (let i = 0; i < config.MOVE; i++) {
                body.push(MOVE);
            }
            for (let i = 0; i < config.CARRY; i++) {
                body.push(CARRY);
            }
            for (let i = 0; i < config.WORK; i++) {
                body.push(WORK);
            }
        }

        return body;
    }

    /**
     * 生成跨房间Upgrader身体配置
     * @param energyLimit 能量限制
     * @returns 身体部件数组
     */
    static generateCrossRoomUpgraderBody(energyLimit: number): BodyPartConstant[] {
        const body: BodyPartConstant[] = [];
        const config = GLOBAL_ALGORITHM_CONFIG.CROSS_ROOM_CONFIG.UPGRADER_BODY;
        let totalCost = 0;

        // 计算总成本
        const totalRequiredCost =
            BODYPART_COST[MOVE] * config.MOVE +
            BODYPART_COST[CARRY] * config.CARRY +
            BODYPART_COST[WORK] * config.WORK;

        // 如果能量不足，按比例缩减
        if (energyLimit < totalRequiredCost) {
            const scale = energyLimit / totalRequiredCost;

            // 按比例添加MOVE部件
            const moveCount = Math.max(1, Math.floor(config.MOVE * scale));
            for (let i = 0; i < moveCount; i++) {
                body.push(MOVE);
            }

            // 按比例添加CARRY部件
            const carryCount = Math.max(1, Math.floor(config.CARRY * scale));
            for (let i = 0; i < carryCount; i++) {
                body.push(CARRY);
            }

            // 按比例添加WORK部件
            const workCount = Math.max(1, Math.floor(config.WORK * scale));
            for (let i = 0; i < workCount; i++) {
                body.push(WORK);
            }
        } else {
            // 完整配置
            for (let i = 0; i < config.MOVE; i++) {
                body.push(MOVE);
            }
            for (let i = 0; i < config.CARRY; i++) {
                body.push(CARRY);
            }
            for (let i = 0; i < config.WORK; i++) {
                body.push(WORK);
            }
        }

        return body;
    }

    /**
     * 计算跨房间Builder总成本
     * @returns 总能量成本
     */
    static calculateCrossRoomBuilderCost(): number {
        const config = GLOBAL_ALGORITHM_CONFIG.CROSS_ROOM_CONFIG.BUILDER_BODY;
        const moveCost = BODYPART_COST[MOVE] * config.MOVE;
        const carryCost = BODYPART_COST[CARRY] * config.CARRY;
        const workCost = BODYPART_COST[WORK] * config.WORK;
        return moveCost + carryCost + workCost;
    }

    /**
     * 计算跨房间Upgrader总成本
     * @returns 总能量成本
     */
    static calculateCrossRoomUpgraderCost(): number {
        const config = GLOBAL_ALGORITHM_CONFIG.CROSS_ROOM_CONFIG.UPGRADER_BODY;
        const moveCost = BODYPART_COST[MOVE] * config.MOVE;
        const carryCost = BODYPART_COST[CARRY] * config.CARRY;
        const workCost = BODYPART_COST[WORK] * config.WORK;
        return moveCost + carryCost + workCost;
    }

    /**
     * 检查是否有足够的能量生产跨房间creep
     * @param room 房间对象
     * @param creepType 跨房间creep类型
     * @returns 是否有足够能量
     */
    static hasEnoughEnergyForCrossRoom(room: Room, creepType: 'builder' | 'upgrader'): boolean {
        const minEnergy = GLOBAL_ALGORITHM_CONFIG.CROSS_ROOM_CONFIG.MIN_ENERGY_FOR_CROSS_ROOM;
        if (room.energyAvailable < minEnergy) {
            return false;
        }

        const requiredEnergy = creepType === 'builder'
            ? this.calculateCrossRoomBuilderCost()
            : this.calculateCrossRoomUpgraderCost();

        return room.energyAvailable >= requiredEnergy;
    }

    /**
     * 检查房间是否属于我
     * @param roomName 房间名称
     * @returns 是否属于我
     */
    static isMyRoom(roomName: string): boolean {
        const room = Game.rooms[roomName];
        if (!room) {
            return false;
        }

        const controller = room.controller;
        if (!controller) {
            return false;
        }

        return controller.my;
    }

    /**
     * 检查房间是否需要建造Spawn
     * @param roomName 房间名称
     * @returns 是否需要建造Spawn
     */
    static needsSpawn(roomName: string): boolean {
        const room = Game.rooms[roomName];

        if (!room) {
            return false; // 无法访问，假设不需要
        }

        if (!this.isMyRoom(roomName)) {
            return false; // 不是我的房间
        }

        // 检查是否已有Spawn
        const spawns = room.find(FIND_MY_STRUCTURES, {
            filter: (s) => s.structureType === STRUCTURE_SPAWN
        });

        if (spawns.length > 0) {
            return false; // 已有Spawn
        }

        // 检查是否有正在建造的Spawn
        const constructionSites = room.find(FIND_CONSTRUCTION_SITES, {
            filter: (s) => s.structureType === STRUCTURE_SPAWN
        });
        return constructionSites.length === 0; // 没有已建成或正在建造的Spawn
    }

    /**
     * 检查房间是否需要升级Controller
     * @param roomName 房间名称
     * @param targetRCL 目标RCL
     * @returns 是否需要升级
     */
    static needsUpgrade(roomName: string, targetRCL: number): boolean {
        const room = Game.rooms[roomName];
        if (!room) {
            return true; // 无法访问，假设需要
        }

        if (!this.isMyRoom(roomName)) {
            return false; // 不是我的房间
        }

        const controller = room.controller;
        if (!controller) {
            return false;
        }

        return controller.level < targetRCL;
    }

    /**
     * 获取最优的跨房间任务目标
     * @param currentRoom 当前房间
     * @param taskType 任务类型 ('build' | 'upgrade')
     * @param candidateTargets 候选目标列表
     * @returns 最优目标
     */
    static getOptimalCrossRoomTarget(
        currentRoom: Room,
        taskType: 'build' | 'upgrade',
        candidateTargets: Array<{ roomName: string; priority: number; [key: string]: any }>
    ): { roomName: string; priority: number; [key: string]: any } | null {
        if (candidateTargets.length === 0) {
            return null;
        }

        // 根据任务类型过滤目标
        let validTargets = candidateTargets;

        if (taskType === 'build') {
            // 建造任务：只选择需要建造Spawn的房间
            validTargets = candidateTargets.filter(target =>
                this.needsSpawn(target.roomName)
            );
        } else if (taskType === 'upgrade') {
            // 升级任务：只选择需要升级的房间
            validTargets = candidateTargets.filter(target =>
                this.needsUpgrade(target.roomName, target.targetRCL) &&
                (!target.stopWhenSpawnBuilt || this.needsSpawn(target.roomName))
            );
        }

        if (validTargets.length === 0) {
            return null;
        }

        // 按优先级和距离排序
        validTargets.sort((a, b) => {
            // 优先考虑优先级设置
            const priorityDiff = a.priority - b.priority;
            if (priorityDiff !== 0) {
                return priorityDiff;
            }

            // 其次考虑距离
            const routeA = Game.map.findRoute(currentRoom.name, a.roomName);
            const routeB = Game.map.findRoute(currentRoom.name, b.roomName);

            const distanceA = routeA === ERR_NO_PATH ? Infinity : routeA.length;
            const distanceB = routeB === ERR_NO_PATH ? Infinity : routeB.length;

            return distanceA - distanceB;
        });

        return validTargets[0];
    }

    /**
     * 更新跨房间任务状态
     * @param homeRoomName 主房间名称
     * @param targetRoomName 目标房间名称
     * @param taskType 任务类型
     * @param status 新状态
     * @param creepName 处理任务的creep名称
     */
    static updateCrossRoomTaskStatus(
        homeRoomName: string,
        targetRoomName: string,
        taskType: 'build' | 'upgrade',
        status: 'pending' | 'in_progress' | 'completed',
        creepName?: string
    ): void {
        const memory = Memory as any;
        const roomConfig = memory.rooms?.[homeRoomName]?.config;

        if (!roomConfig?.crossRoomConfig) {
            return;
        }

        if (taskType === 'build' && roomConfig.crossRoomConfig.buildTargets) {
            const target = roomConfig.crossRoomConfig.buildTargets.find(
                (t: any) => t.roomName === targetRoomName
            );
            if (target) {
                target.status = status;
                if (creepName) {
                    if (!target.assignedCreeps) target.assignedCreeps = [];
                    if (!target.assignedCreeps.includes(creepName)) {
                        target.assignedCreeps.push(creepName);
                    }
                }
            }
        } else if (taskType === 'upgrade' && roomConfig.crossRoomConfig.upgradeTargets) {
            const target = roomConfig.crossRoomConfig.upgradeTargets.find(
                (t: any) => t.roomName === targetRoomName
            );
            if (target) {
                target.active = status !== 'completed';
                if (creepName) {
                    if (!target.assignedCreeps) target.assignedCreeps = [];
                    if (!target.assignedCreeps.includes(creepName)) {
                        target.assignedCreeps.push(creepName);
                    }
                }
            }
        }
    }
}
