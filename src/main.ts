import { ErrorMapper } from "utils/ErrorMapper";
import {CommonConstant} from "./common/CommonConstant";
import {Builder} from "./role/Builder";
import {Harvester} from "./role/Harvester";
import {Upgrader} from "./role/Upgrader";

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
  Game.spawns["Spawn1"].spawnCreep([MOVE,CARRY,WORK],"test1")
  Game.spawns["Spawn1"].spawnCreep([MOVE,CARRY,WORK],"test2")
  Game.spawns["Spawn1"].spawnCreep([MOVE,CARRY,WORK],"test3")
  Game.spawns["Spawn1"].spawnCreep([MOVE,CARRY,WORK],"test4")
  Game.spawns["Spawn1"].spawnCreep([MOVE,CARRY,WORK],"test5")
  Game.spawns["Spawn1"].spawnCreep([MOVE,CARRY,WORK],"test6")
  if(Game.creeps["test1"]!=null){
    Game.creeps["test1"].memory.role = CommonConstant.HARVESTER
  }
  if(Game.creeps["test2"]!=null){
    Game.creeps["test2"].memory.role = CommonConstant.BUILDER
  }
  if(Game.creeps["test3"]!=null){
    Game.creeps["test3"].memory.role = CommonConstant.UPGRADER
  }
  if(Game.creeps["test4"]!=null){
    Game.creeps["test4"].memory.role = CommonConstant.UPGRADER
  }
  if(Game.creeps["test5"]!=null){
    Game.creeps["test5"].memory.role = CommonConstant.BUILDER
  }
  if(Game.creeps["test6"]!=null){
    Game.creeps["test6"].memory.role = CommonConstant.BUILDER
  }
  let sourceList = getSourceList()
  for(var name in Game.creeps) {
    const creep = Game.creeps[name];
    switch (creep.memory.role){
      case CommonConstant.HARVESTER:
        const harvester = new Harvester(creep);
        harvester.harvest(sourceList);
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

function getSourceList(){
  let SourceList:Array<Source> = [];

  for (let SourceId of CommonConstant.SOURCE_ID_LIST) {
    const Source = Game.getObjectById<Id<Source>>(SourceId);
    if (Source) {
      SourceList.push(Source)
    }
  }
  return SourceList;
}
