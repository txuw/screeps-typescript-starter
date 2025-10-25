export class Harvester {

  private creep: Creep

  constructor(creep: Creep) {
    this.creep = creep
  }

  harvest(sources:Array<Source>){
    if(this.creep.store.getUsedCapacity() < this.creep.store.getCapacity()) {
      if(this.creep.harvest(sources[0]) === ERR_NOT_IN_RANGE) {
        this.creep.moveTo(sources[0], {visualizePathStyle: {stroke: '#ffaa00'}});
      }
    }else {
      let targets:Array<any> = [];
      let extensions:Array<StructureExtension> = this.creep.room.find(FIND_STRUCTURES, {
        filter: (structure) => {
          return structure.structureType === STRUCTURE_EXTENSION
        }
      });
      for (let extension of extensions) {
        if(extension.store[RESOURCE_ENERGY] < extension.store.getCapacity(RESOURCE_ENERGY))
          targets.push(extension)
      }
      let spawns:Array<StructureSpawn> = this.creep.room.find(FIND_STRUCTURES, {
        filter: (structure) => {
          return structure.structureType === STRUCTURE_SPAWN
        }
      });
      for (let spawn of spawns) {
        if(spawn.store[RESOURCE_ENERGY] < spawn.store.getCapacity(RESOURCE_ENERGY))
          targets.push(spawn)
      }
      // console.log(creep.room.find(FIND_STRUCTURES))
      if(targets.length > 0) {
        if(this.creep.transfer(targets[0], RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          this.creep.moveTo(targets[0], {visualizePathStyle: {stroke: '#ffffff'}});
        }
      }
    }
  }

}
