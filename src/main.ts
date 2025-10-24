import { ErrorMapper } from "utils/ErrorMapper";

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
  if(Game.creeps["test1"]!=null){
    Game.creeps["test1"].memory.role = "采集者"
  }
  if(Game.creeps["test2"]!=null){
    Game.creeps["test2"].memory.role = "采集者"
  }
  if(Game.creeps["test3"]!=null){
    Game.creeps["test3"].memory.role = "升级者"
  }
  if(Game.creeps["test4"]!=null){
    Game.creeps["test4"].memory.role = "升级者"
  }

  for (let creepName in Game.creeps) {
    let creep = Game.creeps[creepName];
    if (creep.memory.role == "采集者"){
      if(creep.store.getFreeCapacity()>0){
        let sources = creep.room.find(FIND_SOURCES);
        if (creep.harvest(sources[0])== ERR_NOT_IN_RANGE){
          creep.moveTo(sources[0]);
        }
      }else {
        if(creep.transfer(Game.spawns["Spawn1"],RESOURCE_ENERGY) == ERR_NOT_IN_RANGE){
          creep.moveTo(Game.spawns["Spawn1"]);
        }
      }
    }
    if(creep.memory.role == "升级者"){
      if(creep.store.getFreeCapacity()>0){
        let sources = creep.room.find(FIND_SOURCES);
        if (creep.harvest(sources[0])== ERR_NOT_IN_RANGE){
          creep.moveTo(sources[0]);
        }
      }else {
        if(creep.room.controller!=null){
          if(creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE){
            creep.moveTo(creep.room.controller);
          }
        }
      }
    }
  }

  // Automatically delete memory of missing creeps
  for (const name in Memory.creeps) {
    if (!(name in Game.creeps)) {
      delete Memory.creeps[name];
    }
  }
});
