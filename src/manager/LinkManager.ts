import { GLOBAL_ALGORITHM_CONFIG } from "../config/GlobalConstants";
import { GameCacheManager } from "../utils/GameCacheManager";

/**
 * Link类型枚举
 */
export enum LinkType {
  SOURCE = 'source',     // 采集点Link
  STORAGE = 'storage'    // Storage/Spawn中心Link
}

/**
 * Link信息接口
 */
export interface LinkInfo {
  link: StructureLink;
  type: LinkType;
  distance: number;      // 到中心的距离
  priority: number;      // 传输优先级
}

/**
 * Link网络配置
 */
export interface LinkNetworkConfig {
  enabled: boolean;
  transferInterval: number;     // Link传输检查间隔
  sourceTransferThreshold: number; // Source Link传输阈值
  storageTransferThreshold: number; // Storage Link传输阈值
  minEnergyToTransfer: number;  // 最小传输能量
}

/**
 * Link管理器 - 负责房间内Link网络的智能管理
 */
export class LinkManager {
  private static instance: LinkManager;
  private config: LinkNetworkConfig;
  private linkNetworkCache: Map<string, LinkInfo[]> = new Map();
  private lastTransferTime: Map<string, number> = new Map();

  private constructor() {
    this.config = {
      enabled: true,
      transferInterval: 3,                    // 每3tick检查一次传输
      sourceTransferThreshold: GLOBAL_ALGORITHM_CONFIG.LINK_CONFIG.SOURCE_LINK_THRESHOLD,
      storageTransferThreshold: GLOBAL_ALGORITHM_CONFIG.LINK_CONFIG.STORAGE_LINK_THRESHOLD,
      minEnergyToTransfer: GLOBAL_ALGORITHM_CONFIG.LINK_CONFIG.MIN_ENERGY_TO_TRANSFER
    };
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): LinkManager {
    if (!LinkManager.instance) {
      LinkManager.instance = new LinkManager();
    }
    return LinkManager.instance;
  }

  /**
   * 管理指定房间的Link网络
   * @param roomName 房间名称
   */
  public manageRoomLinks(roomName: string): void {
    if (!this.config.enabled) {
      return;
    }

    const room = Game.rooms[roomName];
    if (!room) {
      console.log(`LinkManager: Room ${roomName} not found or not visible`);
      return;
    }

    // 检查传输间隔
    const currentTime = Game.time;
    const lastTime = this.lastTransferTime.get(roomName) || 0;
    if (currentTime - lastTime < this.config.transferInterval) {
      return;
    }

    this.lastTransferTime.set(roomName, currentTime);

    // 构建Link网络
    const linkNetwork = this.buildLinkNetwork(room);
    if (linkNetwork.length === 0) {
      return;
    }

    // 执行能量传输
    this.executeEnergyTransfer(roomName, linkNetwork);
  }

  /**
   * 构建房间的Link网络
   * @param room 房间对象
   * @returns Link信息数组
   */
  private buildLinkNetwork(room: Room): LinkInfo[] {
    // 检查缓存
    const cacheKey = `linkNetwork_${room.name}`;
    const cached = GameCacheManager.getCache<LinkInfo[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // 获取房间内所有Link
    const links = room.find<StructureLink>(FIND_MY_STRUCTURES, {
      filter: structure => structure.structureType === STRUCTURE_LINK
    });

    if (links.length === 0) {
      GameCacheManager.setCache(cacheKey, []);
      return [];
    }

    // 找到中心点（Storage或Spawn）
    const centerPos = this.findCenterPosition(room);
    if (!centerPos) {
      GameCacheManager.setCache(cacheKey, []);
      return [];
    }

    // 分析每个Link的类型和属性
    const linkNetwork: LinkInfo[] = links.map(link => {
      const distance = this.calculateDistance(centerPos, link.pos);
      const type = this.determineLinkType(link, distance);
      const priority = this.calculateLinkPriority(type, distance);

      return {
        link,
        type,
        distance,
        priority
      };
    });

    // 按优先级排序
    linkNetwork.sort((a, b) => a.priority - b.priority);

    // 缓存结果
    GameCacheManager.setCache(cacheKey, linkNetwork);
    this.linkNetworkCache.set(room.name, linkNetwork);

    console.log(`LinkManager: Built network for room ${room.name} with ${linkNetwork.length} links`);
    return linkNetwork;
  }

  /**
   * 找到房间中心位置（Storage或Spawn）
   * @param room 房间对象
   * @returns 中心位置
   */
  private findCenterPosition(room: Room): RoomPosition | null {
    // 优先使用Storage
    const storage = room.find<StructureStorage>(FIND_MY_STRUCTURES, {
      filter: structure => structure.structureType === STRUCTURE_STORAGE
    })[0];

    if (storage) {
      return storage.pos;
    }

    // 如果没有Storage，使用Spawn
    const spawns = room.find(FIND_MY_SPAWNS);
    if (spawns.length > 0) {
      return spawns[0].pos;
    }

    return null;
  }

  /**
   * 确定Link类型
   * @param link Link对象
   * @param distance 到中心的距离
   * @returns Link类型
   */
  private determineLinkType(link: StructureLink, distance: number): LinkType {
    // 检查是否在Source附近（3格范围内）
    const nearbySources = link.room.find(FIND_SOURCES);
    const nearbySourceCount = nearbySources.filter(source =>
      this.calculateDistance(link.pos, source.pos) <= 3
    ).length;

    if (nearbySourceCount > 0) {
      return LinkType.SOURCE;
    }

    // 其他所有Link都是Storage Link（接收中心）
    return LinkType.STORAGE;
  }

  /**
   * 计算Link优先级
   * @param type Link类型
   * @param distance 距离
   * @returns 优先级（数字越小优先级越高）
   */
  private calculateLinkPriority(type: LinkType, distance: number): number {
    switch (type) {
      case LinkType.STORAGE:
        return 0;  // Storage Link最高优先级
      case LinkType.SOURCE:
        return 1;  // Source Link统一优先级
      default:
        return 999;
    }
  }

  /**
   * 执行能量传输
   * @param roomName 房间名称
   * @param linkNetwork Link网络
   */
  private executeEnergyTransfer(roomName: string, linkNetwork: LinkInfo[]): void {
    // 找到所有Storage Link作为接收端
    const storageLinks = linkNetwork.filter(linkInfo => linkInfo.type === LinkType.STORAGE);
    if (storageLinks.length === 0) {
      return; // 没有Storage Link，无法建立网络
    }

    // 找到最优的Storage Link（能量最少且容量最大）
    const bestStorageLink = this.findBestStorageLink(storageLinks);
    if (!bestStorageLink) {
      return;
    }

    // 处理所有Source Link直接传输到Storage Link
    const sourceLinks = linkNetwork.filter(linkInfo => linkInfo.type === LinkType.SOURCE);
    for (const sourceLinkInfo of sourceLinks) {
      this.transferFromSource(sourceLinkInfo, bestStorageLink);
    }
  }

  /**
   * 从Source Link传输能量
   * @param sourceLinkInfo Source Link信息
   * @param storageLinkInfo Storage Link信息
   */
  private transferFromSource(sourceLinkInfo: LinkInfo, storageLinkInfo: LinkInfo): void {
    const sourceLink = sourceLinkInfo.link;
    const storageLink = storageLinkInfo.link;

    const sourceEnergy = sourceLink.store.getUsedCapacity(RESOURCE_ENERGY);
    const storageEnergy = storageLink.store.getUsedCapacity(RESOURCE_ENERGY);
    const storageCapacity = storageLink.store.getCapacity(RESOURCE_ENERGY);

    // 检查传输条件
    const sourceThreshold = this.config.sourceTransferThreshold * sourceLink.store.getCapacity(RESOURCE_ENERGY);
    const storageThreshold = this.config.storageTransferThreshold * storageCapacity;

    if (sourceEnergy >= sourceThreshold &&
        storageEnergy < storageThreshold &&
        sourceEnergy >= this.config.minEnergyToTransfer &&
        sourceLink.cooldown === 0) {

      const result = sourceLink.transferEnergy(storageLink);
      if (result === OK) {
        console.log(`LinkManager: Transferred ${this.config.minEnergyToTransfer} energy from source link ${sourceLink.id} to storage link ${storageLink.id}`);
      }
    }
  }

  /**
   * 找到最优的Storage Link
   * @param storageLinks Storage Link列表
   * @returns 最优的Storage Link信息
   */
  private findBestStorageLink(storageLinks: LinkInfo[]): LinkInfo | null {
    if (storageLinks.length === 0) {
      return null;
    }

    if (storageLinks.length === 1) {
      return storageLinks[0];
    }

    // 选择能量最少且容量最多的Storage Link
    return storageLinks.reduce((best, current) => {
      const bestLink = best.link;
      const currentLink = current.link;

      const bestFillPercent = bestLink.store.getUsedCapacity(RESOURCE_ENERGY) / bestLink.store.getCapacity(RESOURCE_ENERGY);
      const currentFillPercent = currentLink.store.getUsedCapacity(RESOURCE_ENERGY) / currentLink.store.getCapacity(RESOURCE_ENERGY);

      // 优先选择填充率较低的Storage Link
      if (currentFillPercent < bestFillPercent) {
        return current;
      } else if (currentFillPercent === bestFillPercent) {
        // 如果填充率相同，选择距离更近的
        return current.distance < best.distance ? current : best;
      }

      return best;
    });
  }

  /**
   * 获取指定房间的Link统计信息
   * @param roomName 房间名称
   * @returns Link统计信息
   */
  public getLinkStats(roomName: string): { total: number; source: number; storage: number } | null {
    const linkNetwork = this.linkNetworkCache.get(roomName);
    if (!linkNetwork) {
      return null;
    }

    const stats = {
      total: linkNetwork.length,
      source: linkNetwork.filter(link => link.type === LinkType.SOURCE).length,
      storage: linkNetwork.filter(link => link.type === LinkType.STORAGE).length
    };

    return stats;
  }

  /**
   * 获取房间内需要LinkCarry的Link列表
   * @param roomName 房间名称
   * @returns 需要搬运的Link数组
   */
  public getLinksNeedingCarry(roomName: string): StructureLink[] {
    const linkNetwork = this.linkNetworkCache.get(roomName);
    if (!linkNetwork) {
      return [];
    }

    // 只处理Source Link，Storage Link是接收端不需要搬运
    const linksNeedingCarry = linkNetwork
      .filter(linkInfo => {
        if (linkInfo.type !== LinkType.STORAGE) {
          return false; // 只处理STORAGE Link
        }

        const energy = linkInfo.link.store.getUsedCapacity(RESOURCE_ENERGY);
        return energy > this.config.minEnergyToTransfer;
      })
      .map(linkInfo => linkInfo.link);
    return linksNeedingCarry;
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
   * 更新配置
   * @param newConfig 新配置
   */
  public updateConfig(newConfig: Partial<LinkNetworkConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('LinkManager configuration updated:', newConfig);
  }

  /**
   * 获取当前配置
   * @returns 当前配置
   */
  public getConfig(): LinkNetworkConfig {
    return { ...this.config };
  }
}
