import { ErrorMapper } from "utils/ErrorMapper";
import {CommonConstant} from "./common/CommonConstant";
import {Builder} from "./role/Builder";
import {Harvester} from "./role/Harvester";
import {Upgrader} from "./role/Upgrader";
import {Carry} from "./role/Carry";
import {CreepFactory} from "./factory/CreepFactory";

declare global {
  /*
    Example types, expand on these or remove them and add your own.
    Note: Values, properties defined here do no fully *exist* by this type definiton alone.
          You must also give them an implemention if you would like to use them. (ex. actually setting a `role` property in a Creeps memory)

    Types added in this `global` block are in an ambient, global context. This is needed because `main.ts` is a module file (uses import or export).
    Interfaces matching on name from @types/screeps will be merged. This is how you can extend the 'built-in' interfaces from @types/screeps.
  */
  // Memory extension samples
  interface Memory {
    uuid: number;
    log: any;
  }

  interface CreepMemory {
    role: string;
    room: string;
    working: boolean;
    upgrading: boolean;
    building: boolean;
    targetSourceId?: string;
  }

  // Syntax for adding proprties to `global` (ex "global.log")
  namespace NodeJS {
    interface Global {
      log: any;
    }
  }
}

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {
  console.log(`Current game tick is ${Game.time}`);

  // 使用工厂方法进行creep生产
  const creepFactory = CreepFactory.getInstance();
  // 使用贪心生产策略
  const productionResult = creepFactory.greedyProduction(CommonConstant.CREEP_CONFIGS);
  if (productionResult.success) {
    console.log(`Successfully spawned ${productionResult.creepName}`);
  } else if (!productionResult.error?.includes("All creep types") && !productionResult.error?.includes("busy")) {
    console.log(`Production failed: ${productionResult.error}`);
  }
  Game.structures
  for(var name in Game.creeps) {
    const creep = Game.creeps[name];
    let sourceList = getSourceList(creep)
    switch (creep.memory.role){
      case CommonConstant.HARVESTER:
        const harvester = new Harvester(creep);
        harvester.harvest(sourceList);
        break;
      case CommonConstant.CARRY:
        const carry = new Carry(creep);
        carry.transport(sourceList);
        break;
      case CommonConstant.UPGRADER:
        const upgrader = new Upgrader(creep);
        upgrader.upgrade(sourceList);
        break;
      case CommonConstant.BUILDER:
        const builder = new Builder(creep);
        builder.build(sourceList)
        break;
    }
  }

  // Automatically delete memory of missing creeps
  for (const name in Memory.creeps) {
    if (!(name in Game.creeps)) {
      delete Memory.creeps[name];
    }
  }
});

function getSourceList(creep:Creep){
  let SourceList:Array<Source> = [];
  for (let SourceId of CommonConstant.SOURCE_ID_LIST) {
    const Source = Game.getObjectById<Id<Source>>(SourceId);
    if (Source) {
      SourceList.push(Source)
    }
  }

  return SourceList;
}
