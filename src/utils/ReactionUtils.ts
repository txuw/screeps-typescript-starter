/**
 * 反应工具类
 * 提供反应配置的反向查询功能
 */

// 原始的反应配置
export const REACTIONS: Record<string, Record<string, string>> = {
    H: {
        O: "OH",
        L: "LH",
        K: "KH",
        U: "UH",
        Z: "ZH",
        G: "GH"
    },
    O: {
        H: "OH",
        L: "LO",
        K: "KO",
        U: "UO",
        Z: "ZO",
        G: "GO"
    },
    Z: {
        K: "ZK",
        H: "ZH",
        O: "ZO"
    },
    L: {
        U: "UL",
        H: "LH",
        O: "LO"
    },
    K: {
        Z: "ZK",
        H: "KH",
        O: "KO"
    },
    G: {
        H: "GH",
        O: "GO"
    },
    U: {
        L: "UL",
        H: "UH",
        O: "UO"
    },
    OH: {
        UH: "UH2O",
        UO: "UHO2",
        ZH: "ZH2O",
        ZO: "ZHO2",
        KH: "KH2O",
        KO: "KHO2",
        LH: "LH2O",
        LO: "LHO2",
        GH: "GH2O",
        GO: "GHO2"
    },
    X: {
        UH2O: "XUH2O",
        UHO2: "XUHO2",
        LH2O: "XLH2O",
        LHO2: "XLHO2",
        KH2O: "XKH2O",
        KHO2: "XKHO2",
        ZH2O: "XZH2O",
        ZHO2: "XZHO2",
        GH2O: "XGH2O",
        GHO2: "XGHO2"
    },
    ZK: {
        UL: "G"
    },
    UL: {
        ZK: "G"
    },
    LH: {
        OH: "LH2O"
    },
    ZH: {
        OH: "ZH2O"
    },
    GH: {
        OH: "GH2O"
    },
    KH: {
        OH: "KH2O"
    },
    UH: {
        OH: "UH2O"
    },
    LO: {
        OH: "LHO2"
    },
    ZO: {
        OH: "ZHO2"
    },
    KO: {
        OH: "KHO2"
    },
    UO: {
        OH: "UHO2"
    },
    GO: {
        OH: "GHO2"
    },
    LH2O: {
        X: "XLH2O"
    },
    KH2O: {
        X: "XKH2O"
    },
    ZH2O: {
        X: "XZH2O"
    },
    UH2O: {
        X: "XUH2O"
    },
    GH2O: {
        X: "XGH2O"
    },
    LHO2: {
        X: "XLHO2"
    },
    UHO2: {
        X: "XUHO2"
    },
    KHO2: {
        X: "XKHO2"
    },
    ZHO2: {
        X: "XZHO2"
    },
    GHO2: {
        X: "XGHO2"
    }
};

/**
 * 反应材料接口
 */
export interface ReactionMaterials {
    /** 材料1 */
    material1: string;
    /** 材料2 */
    material2: string;
}

/**
 * 反转后的反应配置（预计算结果，避免运行时初始化开销）
 * 格式: map[产物] = [材料1, 材料2]
 */
export const REVERSE_REACTIONS: Record<string, ReactionMaterials[]> = {
    "OH": [
        { material1: "H", material2: "O" },
        { material1: "O", material2: "H" }
    ],
    "LH": [
        { material1: "H", material2: "L" },
        { material1: "L", material2: "H" }
    ],
    "KH": [
        { material1: "H", material2: "K" },
        { material1: "K", material2: "H" }
    ],
    "UH": [
        { material1: "H", material2: "U" },
        { material1: "U", material2: "H" }
    ],
    "ZH": [
        { material1: "H", material2: "Z" },
        { material1: "Z", material2: "H" }
    ],
    "GH": [
        { material1: "H", material2: "G" },
        { material1: "G", material2: "H" }
    ],
    "LO": [
        { material1: "O", material2: "L" },
        { material1: "L", material2: "O" }
    ],
    "KO": [
        { material1: "O", material2: "K" },
        { material1: "K", material2: "O" }
    ],
    "UO": [
        { material1: "O", material2: "U" },
        { material1: "U", material2: "O" }
    ],
    "ZO": [
        { material1: "O", material2: "Z" },
        { material1: "Z", material2: "O" }
    ],
    "GO": [
        { material1: "O", material2: "G" },
        { material1: "G", material2: "O" }
    ],
    "ZK": [
        { material1: "Z", material2: "K" },
        { material1: "K", material2: "Z" }
    ],
    "UL": [
        { material1: "L", material2: "U" },
        { material1: "U", material2: "L" }
    ],
    "UH2O": [
        { material1: "OH", material2: "UH" },
        { material1: "UH", material2: "OH" }
    ],
    "UHO2": [
        { material1: "OH", material2: "UO" },
        { material1: "UO", material2: "OH" }
    ],
    "ZH2O": [
        { material1: "OH", material2: "ZH" },
        { material1: "ZH", material2: "OH" }
    ],
    "ZHO2": [
        { material1: "OH", material2: "ZO" },
        { material1: "ZO", material2: "OH" }
    ],
    "KH2O": [
        { material1: "OH", material2: "KH" },
        { material1: "KH", material2: "OH" }
    ],
    "KHO2": [
        { material1: "OH", material2: "KO" },
        { material1: "KO", material2: "OH" }
    ],
    "LH2O": [
        { material1: "OH", material2: "LH" },
        { material1: "LH", material2: "OH" }
    ],
    "LHO2": [
        { material1: "OH", material2: "LO" },
        { material1: "LO", material2: "OH" }
    ],
    "GH2O": [
        { material1: "OH", material2: "GH" },
        { material1: "GH", material2: "OH" }
    ],
    "GHO2": [
        { material1: "OH", material2: "GO" },
        { material1: "GO", material2: "OH" }
    ],
    "XUH2O": [
        { material1: "X", material2: "UH2O" },
        { material1: "UH2O", material2: "X" }
    ],
    "XUHO2": [
        { material1: "X", material2: "UHO2" },
        { material1: "UHO2", material2: "X" }
    ],
    "XLH2O": [
        { material1: "X", material2: "LH2O" },
        { material1: "LH2O", material2: "X" }
    ],
    "XLHO2": [
        { material1: "X", material2: "LHO2" },
        { material1: "LHO2", material2: "X" }
    ],
    "XKH2O": [
        { material1: "X", material2: "KH2O" },
        { material1: "KH2O", material2: "X" }
    ],
    "XKHO2": [
        { material1: "X", material2: "KHO2" },
        { material1: "KHO2", material2: "X" }
    ],
    "XZH2O": [
        { material1: "X", material2: "ZH2O" },
        { material1: "ZH2O", material2: "X" }
    ],
    "XZHO2": [
        { material1: "X", material2: "ZHO2" },
        { material1: "ZHO2", material2: "X" }
    ],
    "XGH2O": [
        { material1: "X", material2: "GH2O" },
        { material1: "GH2O", material2: "X" }
    ],
    "XGHO2": [
        { material1: "X", material2: "GHO2" },
        { material1: "GHO2", material2: "X" }
    ],
    "G": [
        { material1: "ZK", material2: "UL" },
        { material1: "UL", material2: "ZK" }
    ]
};

/**
 * 获取生成指定资源所需的材料
 * @param product 要生成的产物
 * @returns 返回生成该产物所需的材料组合数组，如果无法生成则返回undefined
 * @example
 * ```typescript
 * const materials = getReactionMaterials('OH');
 * // 返回: [{ material1: 'H', material2: 'O' }, { material1: 'O', material2: 'H' }]
 *
 * const materials2 = getReactionMaterials('UH2O');
 * // 返回: [{ material1: 'OH', material2: 'UH' }, { material1: 'UH', material2: 'OH' }]
 * ```
 */
export function getReactionMaterials(product: string): ReactionMaterials[] | undefined {
    return REVERSE_REACTIONS[product];
}

/**
 * 检查某个资源是否可以通过反应生成
 * @param product 要检查的产物
 * @returns 如果可以通过反应生成返回true，否则返回false
 */
export function isReactable(product: string): boolean {
    return REVERSE_REACTIONS[product] !== undefined && REVERSE_REACTIONS[product].length > 0;
}

/**
 * 获取生成指定资源的第一个材料组合（通常只有一个组合）
 * @param product 要生成的产物
 * @returns 返回材料组合，如果无法生成则返回undefined
 */
export function getFirstReactionMaterials(product: string): ReactionMaterials | undefined {
    const materials = REVERSE_REACTIONS[product];
    return materials && materials.length > 0 ? materials[0] : undefined;
}

/**
 * 打印反应链（调试用）
 * @param product 产物
 */
export function printReactionChain(product: string): void {
    console.log(`=== 生成 ${product} 的反应链 ===`);

    const materials = getReactionMaterials(product);
    if (!materials) {
        console.log(`${product} 无法通过反应生成，可能是基础资源`);
        return;
    }

    console.log(`直接材料: ${materials.map(m => `${m.material1} + ${m.material2}`).join(' 或 ')}`);

    // 递归打印材料的生成方式
    for (const mat of materials) {
        if (isReactable(mat.material1)) {
            console.log(`  ${mat.material1} 需要: ${getFirstReactionMaterials(mat.material1)?.material1} + ${getFirstReactionMaterials(mat.material1)?.material2}`);
        }
        if (isReactable(mat.material2)) {
            console.log(`  ${mat.material2} 需要: ${getFirstReactionMaterials(mat.material2)?.material1} + ${getFirstReactionMaterials(mat.material2)?.material2}`);
        }
    }
}

