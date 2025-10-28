
import { GLOBAL_ALGORITHM_CONFIG } from '../config/GlobalConstants';

/**
 * 探索者相关工具函数
 */
export class ClaimerUtils {
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
     * 检查房间是否可以被占领
     * @param roomName 房间名称
     * @returns 是否可以占领
     */
    static canClaimRoom(roomName: string): boolean {
        const room = Game.rooms[roomName];
        if (!room) {
            return true; // 未探索的房间假设可以占领
        }

        const controller = room.controller;
        if (!controller) {
            return false; // 没有控制器的房间不能占领
        }

        // 检查控制器状态
        if (controller.owner) {
            return false; // 已被其他玩家占领
        }

        if (controller.reservation) {
            return false; // 已被预定
        }

        return true;
    }

    /**
     * 获取房间控制器的位置
     * @param roomName 房间名称
     * @returns 控制器位置或null
     */
    static getControllerPosition(roomName: string): { x: number; y: number } | null {
        const room = Game.rooms[roomName];
        if (!room) {
            return null;
        }

        const controller = room.controller;
        if (!controller) {
            return null;
        }

        return {
            x: controller.pos.x,
            y: controller.pos.y
        };
    }

    /**
     * 生成探索者身体配置
     * @param energyLimit 能量限制
     * @returns 身体部件数组
     */
    static generateClaimerBody(energyLimit: number): BodyPartConstant[] {
        const body: BodyPartConstant[] = [];
        let totalCost = 0;

        // 添加CLAIM部件
        const claimCost = BODYPART_COST[CLAIM];
        const claimParts = Math.min(GLOBAL_ALGORITHM_CONFIG.CLAIMER_CONFIG.CLAIM_PARTS, Math.floor(energyLimit / claimCost));

        for (let i = 0; i < claimParts; i++) {
            body.push(CLAIM);
            totalCost += claimCost;
        }

        // 添加MOVE部件
        const moveCost = BODYPART_COST[MOVE];
        const availableEnergy = energyLimit - totalCost;
        const moveParts = Math.min(GLOBAL_ALGORITHM_CONFIG.CLAIMER_CONFIG.MOVE_PARTS, Math.floor(availableEnergy / moveCost));

        for (let i = 0; i < moveParts; i++) {
            body.push(MOVE);
            totalCost += moveCost;
        }

        return body;
    }

    /**
     * 计算探索者总成本
     * @returns 总能量成本
     */
    static calculateClaimerCost(): number {
        const claimCost = BODYPART_COST[CLAIM] * GLOBAL_ALGORITHM_CONFIG.CLAIMER_CONFIG.CLAIM_PARTS;
        const moveCost = BODYPART_COST[MOVE] * GLOBAL_ALGORITHM_CONFIG.CLAIMER_CONFIG.MOVE_PARTS;
        return claimCost + moveCost;
    }

    /**
     * 检查是否有足够的能量生产探索者
     * @param room 房间对象
     * @returns 是否有足够能量
     */
    static hasEnoughEnergy(room: Room): boolean {
        const requiredEnergy = this.calculateClaimerCost();
        return room.energyAvailable >= requiredEnergy;
    }

    /**
     * 获取最优的占领目标
     * @param currentRoom 当前房间
     * @param candidateRooms 候选房间列表
     * @returns 最优目标房间
     */
    static getOptimalClaimTarget(
        currentRoom: Room,
        candidateRooms: Array<{ roomName: string; x: number; y: number; priority?: number }>
    ): { roomName: string; x: number; y: number } | null {
        if (candidateRooms.length === 0) {
            return null;
        }

        // 过滤掉无法占领的房间
        const availableRooms = candidateRooms.filter(room =>
            this.canClaimRoom(room.roomName)
        );

        if (availableRooms.length === 0) {
            return null;
        }

        // 按优先级和距离排序
        availableRooms.sort((a, b) => {
            // 优先考虑优先级设置
            const priorityDiff = (b.priority || 1) - (a.priority || 1);
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

        return availableRooms[0];
    }
}