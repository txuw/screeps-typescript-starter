import { CommonConstant } from "../common/CommonConstant";

/**
 * 缓存数据接口
 */
interface CacheData<T> {
  data: T;
  timestamp: number;
  tick: number;
}

/**
 * Game全局变量缓存管理器
 * 用于缓存游戏中的动态数据，提高性能
 */
export class GameCacheManager {
  private static cache: { [key: string]: CacheData<any> } = {};

  /**
   * 设置缓存数据
   * @param key 缓存键
   * @param data 要缓存的数据
   */
  static setCache<T>(key: string, data: T): void {
    if (!CommonConstant.ENABLE_GLOBAL_CACHE) {
      return;
    }

    this.cache[key] = {
      data: data,
      timestamp: Date.now(),
      tick: Game.time
    };
  }

  /**
   * 获取缓存数据
   * @param key 缓存键
   * @returns 缓存的数据，如果不存在或已过期则返回null
   */
  static getCache<T>(key: string): T | null {
    if (!CommonConstant.ENABLE_GLOBAL_CACHE) {
      return null;
    }

    const cached = this.cache[key];
    if (!cached) {
      return null;
    }

    // 检查缓存是否过期
    if (Game.time - cached.tick > CommonConstant.CACHE_DURATION) {
      this.removeCache(key);
      return null;
    }

    return cached.data as T;
  }

  /**
   * 移除缓存数据
   * @param key 缓存键
   */
  static removeCache(key: string): void {
    delete this.cache[key];
  }

  /**
   * 清空所有缓存
   */
  static clearAllCache(): void {
    this.cache = {};
  }

  /**
   * 清理过期缓存
   */
  static cleanupExpiredCache(): void {
    const currentTick = Game.time;
    const expiredKeys: string[] = [];

    for (const key in this.cache) {
      if (currentTick - this.cache[key].tick > CommonConstant.CACHE_DURATION) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.removeCache(key);
    }
  }

  /**
   * 获取房间内的Source缓存
   * @param roomName 房间名称
   * @returns Source列表
   */
  static getRoomSources(roomName: string): Array<Source> {
    const cacheKey = `sources_${roomName}`;
    let sources = this.getCache<Array<Source>>(cacheKey);

    if (!sources) {
      const room = Game.rooms[roomName];
      if (room) {
        sources = room.find(FIND_SOURCES);
        this.setCache(cacheKey, sources);
      } else {
        sources = [];
      }
    }

    return sources;
  }

  /**
   * 获取房间内的Container缓存
   * @param roomName 房间名称
   * @returns Container列表
   */
  static getRoomContainers(roomName: string): Array<StructureContainer> {
    const cacheKey = `containers_${roomName}`;
    let containers = this.getCache<Array<StructureContainer>>(cacheKey);

    if (!containers) {
      const room = Game.rooms[roomName];
      if (room) {
        containers = room.find(FIND_STRUCTURES, {
          filter: structure => structure.structureType === STRUCTURE_CONTAINER
        }) as Array<StructureContainer>;
        this.setCache(cacheKey, containers);
      } else {
        containers = [];
      }
    }

    return containers;
  }

  /**
   * 获取房间内需要能量的Container缓存
   * @param roomName 房间名称
   * @returns 需要能量的Container列表
   */
  static getNeedyContainers(roomName: string): Array<StructureContainer> {
    const cacheKey = `needy_containers_${roomName}`;
    let containers = this.getCache<Array<StructureContainer>>(cacheKey);

    if (!containers) {
      const room = Game.rooms[roomName];
      if (room) {
        containers = room.find(FIND_STRUCTURES, {
          filter: structure =>
            structure.structureType === STRUCTURE_CONTAINER &&
            (structure as StructureContainer).store[RESOURCE_ENERGY] < (structure as StructureContainer).store.getCapacity(RESOURCE_ENERGY)
        }) as Array<StructureContainer>;
        this.setCache(cacheKey, containers);
      } else {
        containers = [];
      }
    }

    return containers;
  }

  /**
   * 获取房间内有能量的Container缓存
   * @param roomName 房间名称
   * @returns 有能量的Container列表
   */
  static getAvailableContainers(roomName: string): Array<StructureContainer> {
    const cacheKey = `available_containers_${roomName}`;
    let containers = this.getCache<Array<StructureContainer>>(cacheKey);

    if (!containers) {
      const room = Game.rooms[roomName];
      if (room) {
        containers = room.find(FIND_STRUCTURES, {
          filter: structure =>
            structure.structureType === STRUCTURE_CONTAINER &&
            (structure as StructureContainer).store[RESOURCE_ENERGY] > 0
        }) as Array<StructureContainer>;
        this.setCache(cacheKey, containers);
      } else {
        containers = [];
      }
    }

    return containers;
  }

  /**
   * 获取房间内所有Creeps按角色分组的缓存
   * @param roomName 房间名称
   * @returns 按角色分组的Creep映射表
   */
  static getCreepsByRole(roomName?: string): { [role: string]: Array<Creep> } {
    const cacheKey = `creeps_by_role_${roomName || 'global'}`;
    let creepsByRole = this.getCache<{ [role: string]: Array<Creep> }>(cacheKey);

    if (!creepsByRole) {
      creepsByRole = {};

      for (const creepName in Game.creeps) {
        const creep = Game.creeps[creepName];

        // 如果指定了房间名称，只包含该房间的creep
        if (roomName && creep.room.name !== roomName) {
          continue;
        }

        const role = creep.memory.role;
        if (!creepsByRole[role]) {
          creepsByRole[role] = [];
        }
        creepsByRole[role].push(creep);
      }

      this.setCache(cacheKey, creepsByRole);
    }

    return creepsByRole;
  }

  /**
   * 使特定房间的缓存失效
   * @param roomName 房间名称
   */
  static invalidateRoomCache(roomName: string): void {
    const keysToRemove: string[] = [];

    for (const key in this.cache) {
      if (key.includes(`_${roomName}`)) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      this.removeCache(key);
    }
  }

  /**
   * 获取缓存统计信息
   * @returns 缓存统计信息
   */
  static getCacheStats(): { totalEntries: number; expiredEntries: number } {
    const currentTick = Game.time;
    let expiredEntries = 0;

    for (const key in this.cache) {
      if (currentTick - this.cache[key].tick > CommonConstant.CACHE_DURATION) {
        expiredEntries++;
      }
    }

    return {
      totalEntries: Object.keys(this.cache).length,
      expiredEntries: expiredEntries
    };
  }
}