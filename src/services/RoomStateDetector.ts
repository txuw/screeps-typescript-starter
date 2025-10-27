import { RoomState, RoomStatusInfo, RoomDevelopmentStage } from '../types/RoomState';
import { RoomConfig } from '../types/RoomConfig';
import { GLOBAL_ROOM_THRESHOLDS } from '../config/GlobalConstants';

/**
 * RoomStateDetector - 房间状态检测服务
 * 负责检测和分析房间状态，提供状态评估和预警
 */
export class RoomStateDetector {
    /**
     * 检测房间完整状态
     */
    public static detectRoomState(room: Room, config: RoomConfig): RoomStatusInfo {
        const controller = room.controller;
        const rcl = controller?.level || 0;

        // 计算各种状态指标
        const energyMetrics = this.calculateEnergyMetrics(room);
        const securityMetrics = this.calculateSecurityMetrics(room);
        const developmentMetrics = this.calculateDevelopmentMetrics(room);
        const economyMetrics = this.calculateEconomyMetrics(room);

        // 确定发展阶段
        const developmentStage = this.determineDevelopmentStage(rcl);

        // 确定房间状态
        const state = this.determineRoomState(
            energyMetrics,
            securityMetrics,
            developmentMetrics,
            config
        );

        return {
            state,
            developmentStage,
            rcl,
            energyStored: energyMetrics.total,
            energyCapacity: energyMetrics.capacity,
            hasEnemy: securityMetrics.hasEnemies,
            constructionSites: developmentMetrics.constructionSites,
            structuresDamaged: developmentMetrics.damagedStructures,
            lastUpdated: Game.time,
        };
    }

    /**
     * 检测房间是否需要紧急关注
     */
    public static detectEmergencyConditions(room: Room): {
        isEmergency: boolean;
        emergencyType: 'energy' | 'security' | 'structure' | 'creep' | 'none';
        severity: 'low' | 'medium' | 'high' | 'critical';
        description: string;
    } {
        // 检查能量紧急状态
        const energyEmergency = this.checkEnergyEmergency(room);
        if (energyEmergency.isEmergency) {
            return energyEmergency;
        }

        // 检查安全紧急状态
        const securityEmergency = this.checkSecurityEmergency(room);
        if (securityEmergency.isEmergency) {
            return securityEmergency;
        }

        // 检查建筑紧急状态
        const structureEmergency = this.checkStructureEmergency(room);
        if (structureEmergency.isEmergency) {
            return structureEmergency;
        }

        // 检查creep紧急状态
        const creepEmergency = this.checkCreepEmergency(room);
        if (creepEmergency.isEmergency) {
            return creepEmergency;
        }

        return {
            isEmergency: false,
            emergencyType: 'none',
            severity: 'low',
            description: '房间状态正常',
        };
    }

    /**
     * 计算能量相关指标
     */
    private static calculateEnergyMetrics(room: Room): {
        total: number;
        available: number;
        capacity: number;
        percentage: number;
        sources: number;
        containers: number;
        storage: number;
        terminal: number;
    } {
        let totalEnergy = 0;
        let availableEnergy = room.energyAvailable || 0;
        let capacity = room.energyCapacityAvailable || 1;
        let containersEnergy = 0;
        let storageEnergy = 0;
        let terminalEnergy = 0;

        // 容器能量
        const containers = room.find<StructureContainer>(FIND_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_CONTAINER
        });
        containers.forEach(container => {
            if (container.store[RESOURCE_ENERGY]) {
                containersEnergy += container.store[RESOURCE_ENERGY];
            }
        });

        // 存储能量
        const storage = room.storage;
        if (storage && storage.store[RESOURCE_ENERGY]) {
            storageEnergy += storage.store[RESOURCE_ENERGY];
        }

        // 终端能量
        const terminal = room.terminal;
        if (terminal && terminal.store[RESOURCE_ENERGY]) {
            terminalEnergy += terminal.store[RESOURCE_ENERGY];
        }

        totalEnergy = availableEnergy + containersEnergy + storageEnergy + terminalEnergy;

        return {
            total: totalEnergy,
            available: availableEnergy,
            capacity: capacity,
            percentage: totalEnergy / Math.max(capacity, 1),
            sources: room.find(FIND_SOURCES).length,
            containers: containers.length,
            storage: storageEnergy,
            terminal: terminalEnergy,
        };
    }

    /**
     * 计算安全相关指标
     */
    private static calculateSecurityMetrics(room: Room): {
        hasEnemies: boolean;
        enemyCount: number;
        enemyPower: number;
        towersCount: number;
        towersOperational: number;
        wallsIntegrity: number;
        rampartsIntegrity: number;
    } {
        // 检测敌人
        const enemies = room.find(FIND_HOSTILE_CREEPS);
        const enemyCount = enemies.length;
        let enemyPower = 0;

        enemies.forEach(enemy => {
            // 估算敌人战力
            enemyPower += enemy.body.filter(part => part.type === ATTACK || part.type === RANGED_ATTACK || part.type === HEAL).length;
        });

        // 塔防状态
        const towers = room.find<StructureTower>(FIND_MY_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_TOWER
        });
        const towersOperational = towers.filter(tower => tower.energy > 0).length;

        // 防御工事完整性
        const walls = room.find<StructureWall>(FIND_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_WALL
        });
        const ramparts = room.find<StructureRampart>(FIND_MY_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_RAMPART
        });

        const wallsIntegrity = walls.length > 0 ?
            walls.reduce((sum, wall) => sum + wall.hits / wall.hitsMax, 0) / walls.length : 1;
        const rampartsIntegrity = ramparts.length > 0 ?
            ramparts.reduce((sum, rampart) => sum + rampart.hits / rampart.hitsMax, 0) / ramparts.length : 1;

        return {
            hasEnemies: enemyCount > 0,
            enemyCount,
            enemyPower,
            towersCount: towers.length,
            towersOperational,
            wallsIntegrity,
            rampartsIntegrity,
        };
    }

    /**
     * 计算发展相关指标
     */
    private static calculateDevelopmentMetrics(room: Room): {
        constructionSites: number;
        damagedStructures: number;
        totalStructures: number;
        controllerProgress: number;
        controllerProgressTotal: number;
        storageLevel: number;
        sourcesCount: number;
        mineralsCount: number;
    } {
        // 建筑工地
        const constructionSites = room.find(FIND_CONSTRUCTION_SITES).length;

        // 损坏建筑
        const damagedStructures = room.find(FIND_STRUCTURES, {
            filter: structure => structure.hits < structure.hitsMax * 0.9 // 90%以下认为损坏
        }).length;

        // 总建筑数
        const totalStructures = room.find(FIND_STRUCTURES).length;

        // Controller进度
        const controller = room.controller;
        const controllerProgress = controller?.progress || 0;
        const controllerProgressTotal = controller?.progressTotal || 1;

        // 存储级别
        let storageLevel = 0;
        const storage = room.storage;
        if (storage && storage.store[RESOURCE_ENERGY]) {
            if (storage.store[RESOURCE_ENERGY] > 500000) storageLevel = 3;
            else if (storage.store[RESOURCE_ENERGY] > 200000) storageLevel = 2;
            else if (storage.store[RESOURCE_ENERGY] > 50000) storageLevel = 1;
        }

        // 资源点
        const sourcesCount = room.find(FIND_SOURCES).length;
        const mineralsCount = room.find(FIND_MINERALS).length;

        return {
            constructionSites,
            damagedStructures,
            totalStructures,
            controllerProgress,
            controllerProgressTotal,
            storageLevel,
            sourcesCount,
            mineralsCount,
        };
    }

    /**
     * 计算经济相关指标
     */
    private static calculateEconomyMetrics(room: Room): {
        creepCount: number;
        workingCreeps: number;
        idleCreeps: number;
        harvestRate: number;
        energyIncome: number;
        energyConsumption: number;
    } {
        const creeps = room.find(FIND_MY_CREEPS);
        const creepCount = creeps.length;

        // 计算工作状态
        let workingCreeps = 0;
        let idleCreeps = 0;

        creeps.forEach(creep => {
            if (creep.memory.working) {
                workingCreeps++;
            } else {
                idleCreeps++;
            }
        });

        // 简单的采集速率估算（基于实际采集中creep的数量）
        const harvestingCreeps = creeps.filter(creep =>
            creep.memory.role === 'harvester' && !creep.memory.working
        ).length;
        const harvestRate = harvestingCreeps * 2; // 假设每个harvester每tick采集2能量

        return {
            creepCount,
            workingCreeps,
            idleCreeps,
            harvestRate,
            energyIncome: harvestRate,
            energyConsumption: creepCount * 2, // 简化估算
        };
    }

    /**
     * 确定发展阶段
     */
    private static determineDevelopmentStage(rcl: number): RoomDevelopmentStage {
        if (rcl <= 3) return RoomDevelopmentStage.EARLY;
        if (rcl <= 6) return RoomDevelopmentStage.MID;
        return RoomDevelopmentStage.LATE;
    }

    /**
     * 确定房间状态
     */
    private static determineRoomState(
        energyMetrics: any,
        securityMetrics: any,
        developmentMetrics: any,
        config: RoomConfig
    ): RoomState {
        const thresholds = config.stateConfig.thresholds;

        // 紧急状态检查
        if (energyMetrics.percentage < thresholds.emergencyEnergyThreshold / 100) {
            return RoomState.EMERGENCY;
        }

        if (securityMetrics.hasEnemies && securityMetrics.enemyPower > 5) {
            return RoomState.UNDER_ATTACK;
        }

        // 基础状态检查
        if (energyMetrics.percentage < thresholds.lowEnergyThreshold / 100) {
            return RoomState.LOW_ENERGY;
        }

        if (developmentMetrics.constructionSites > thresholds.maxConstructionSites) {
            return RoomState.DEVELOPING;
        }

        // if (developmentMetrics.damagedStructures > thresholds.damagedStructuresThreshold) {
        //     return RoomState.REBUILDING;
        // }

        if (securityMetrics.hasEnemies) {
            return RoomState.UNDER_ATTACK;
        }

        // 检查是否为防御状态（高等级RCL，完整防御）
        if (energyMetrics.percentage > 0.8 &&
            securityMetrics.rampartsIntegrity > 0.9 &&
            securityMetrics.towersOperational >= 3) {
            return RoomState.FORTIFIED;
        }

        return RoomState.NORMAL;
    }

    /**
     * 检查能量紧急状态
     */
    private static checkEnergyEmergency(room: Room): any {
        const energyMetrics = this.calculateEnergyMetrics(room);
        const isEmergency = energyMetrics.percentage < 0.1; // 10%以下

        if (!isEmergency) {
            return { isEmergency: false, emergencyType: 'energy', severity: 'low', description: '' };
        }

        let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
        let description = '';

        if (energyMetrics.percentage < 0.05) {
            severity = 'critical';
            description = '能量极低，房间即将停摆';
        } else if (energyMetrics.percentage < 0.08) {
            severity = 'high';
            description = '能量严重不足，creep工作受阻';
        } else {
            severity = 'medium';
            description = '能量不足，需要关注采集';
        }

        return {
            isEmergency: true,
            emergencyType: 'energy' as const,
            severity,
            description,
        };
    }

    /**
     * 检查安全紧急状态
     */
    private static checkSecurityEmergency(room: Room): any {
        const securityMetrics = this.calculateSecurityMetrics(room);
        const isEmergency = securityMetrics.hasEnemies && securityMetrics.enemyPower > 3;

        if (!isEmergency) {
            return { isEmergency: false, emergencyType: 'security', severity: 'low', description: '' };
        }

        let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
        let description = '';

        if (securityMetrics.enemyPower > 10 || securityMetrics.towersOperational === 0) {
            severity = 'critical';
            description = '强大敌人入侵且防御不足';
        } else if (securityMetrics.enemyPower > 5) {
            severity = 'high';
            description = '中等强度敌人入侵';
        } else {
            severity = 'medium';
            description = '发现敌人，需要警戒';
        }

        return {
            isEmergency: true,
            emergencyType: 'security' as const,
            severity,
            description,
        };
    }

    /**
     * 检查建筑紧急状态
     */
    private static checkStructureEmergency(room: Room): any {
        const controller = room.controller;
        const rcl = controller?.level || 0;
        const isEmergency = rcl > 0 && room.find(FIND_MY_STRUCTURES).filter(s => s.structureType === STRUCTURE_SPAWN).length === 0;

        if (!isEmergency) {
            return { isEmergency: false, emergencyType: 'structure', severity: 'low', description: '' };
        }

        return {
            isEmergency: true,
            emergencyType: 'structure' as const,
            severity: 'critical',
            description: '没有可用的Spawn，无法生产creep',
        };
    }

    /**
     * 检查creep紧急状态
     */
    private static checkCreepEmergency(room: Room): any {
        const creeps = room.find(FIND_MY_CREEPS);
        const isEmergency = creeps.length === 0 && room.controller?.level && room.controller.level > 0;

        if (!isEmergency) {
            return { isEmergency: false, emergencyType: 'creep', severity: 'low', description: '' };
        }

        return {
            isEmergency: true,
            emergencyType: 'creep' as const,
            severity: 'high',
            description: '房间没有任何creep，需要立即生产',
        };
    }
}
