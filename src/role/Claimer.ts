import { GLOBAL_ALGORITHM_CONFIG } from '../config/GlobalConstants';
import { ClaimerUtils } from '../utils/ClaimerUtils';

/**
 * 探索者工种 - 负责占领新的中立房间控制器
 *
 * 特性：
 * - 身体配置：[CLAIM, CLAIM, MOVE x 10]
 * - 从主房间生产后派往目标房间
 * - 使用claimController占领中立房间控制器
 * - 完成任务后等待消亡（CLAIM部件无法续命）
 */
export class Claimer {
    creep: Creep;

    constructor(creep: Creep) {
        this.creep = creep;
    }

    /**
     * 主要工作方法
     */
    work(): void {
        const targetRoom = this.getTargetRoom();
        if (!targetRoom) {
            console.log(`[Claimer] ${this.creep.name} 没有目标房间，等待消亡`);
            return;
        }

        // 检查是否到达目标房间
        if (this.creep.room.name !== targetRoom.roomName) {
            this.moveToTargetRoom(targetRoom);
        } else {
            // 已在目标房间，执行占领逻辑
            this.claimController(targetRoom);
        }
    }

    /**
     * 获取目标房间配置
     */
    private getTargetRoom(): { roomName: string; x: number; y: number } | null {
        // 从内存中获取目标房间配置
        const memory = Memory as any;
        const targetRooms = memory.targetRooms || memory.claimerConfig?.targetRooms;

        if (!targetRooms || !Array.isArray(targetRooms) || targetRooms.length === 0) {
            return null;
        }

        // 返回第一个未占领的目标房间
        for (const target of targetRooms) {
            if (!target.claimed) {
                return {
                    roomName: target.roomName,
                    x: target.x,
                    y: target.y
                };
            }
        }

        return null;
    }

    /**
     * 移动到目标房间
     */
    private moveToTargetRoom(targetRoom: { roomName: string; x: number; y: number }): void {
        const result = ClaimerUtils.moveToRoom(this.creep, targetRoom.roomName);

        if (result === ERR_NO_PATH) {
            console.log(`[Claimer] ${this.creep.name} 无法找到到 ${targetRoom.roomName} 的路径`);
        } else if (result === ERR_INVALID_TARGET) {
            console.log(`[Claimer] ${this.creep.name} 目标房间 ${targetRoom.roomName} 无效`);
        }
    }

    /**
     * 占领控制器
     */
    private claimController(targetRoom: { roomName: string; x: number; y: number }): void {
        const controller = this.creep.room.controller;

        if (!controller) {
            console.log(`[Claimer] ${this.creep.name} 在房间 ${this.creep.room.name} 中找不到控制器`);
            return;
        }

        // 检查是否已经到达目标位置附近
        const targetPos = new RoomPosition(targetRoom.x, targetRoom.y, targetRoom.roomName);
        const distance = this.creep.pos.getRangeTo(targetPos);

        if (distance > GLOBAL_ALGORITHM_CONFIG.CLAIMER_CONFIG.CLAIM_RANGE) {
            // 移动到目标位置
            this.creep.moveTo(targetPos);
        } else {
            // 尝试占领控制器
            const result = this.creep.claimController(controller);

            if (result === OK) {
                console.log(`[Claimer] ${this.creep.name} 成功占领房间 ${targetRoom.roomName} 的控制器`);
                this.markRoomAsClaimed(targetRoom.roomName);
            } else if (result === ERR_FULL) {
                console.log(`[Claimer] ${this.creep.name} 无法占领，控制器已被其他玩家预定或占领`);
            } else if (result === ERR_NOT_IN_RANGE) {
                // 距离不够，继续移动
                this.creep.moveTo(controller);
            } else if (result === ERR_INVALID_TARGET) {
                console.log(`[Claimer] ${this.creep.name} 控制器无效，可能已被占领`);
            }
        }
    }

    /**
     * 标记房间为已占领
     */
    private markRoomAsClaimed(roomName: string): void {
        const memory = Memory as any;
        const targetRooms = memory.targetRooms || memory.claimerConfig?.targetRooms;

        if (targetRooms && Array.isArray(targetRooms)) {
            const target = targetRooms.find((t: any) => t.roomName === roomName);
            if (target) {
                target.claimed = true;
                target.claimedAt = Game.time;
                target.claimedBy = this.creep.name;
            }
        }
    }

    /**
     * 检查是否还应该继续工作
     * CLAIM部件的creep无法续命，寿命只有600tick
     */
    shouldContinueWorking(): boolean {
        // 检查是否还有任务
        const targetRoom = this.getTargetRoom();
        if (!targetRoom) {
            return false;
        }

        // 检查剩余寿命，如果寿命不足，返回false
        const remainingTicks = this.creep.ticksToLive || 0;
        const estimatedTravelTime = ClaimerUtils.estimateTravelTime(this.creep.pos, targetRoom.roomName);

        return remainingTicks > estimatedTravelTime + 50; // 预留50tick缓冲
    }
}