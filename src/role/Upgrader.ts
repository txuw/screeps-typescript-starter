export class Upgrader{
  creep:Creep

  constructor(creep: Creep) {
    this.creep = creep;
  }

  upgrade(sources:Array<Source>){
    if(this.creep.memory.upgrading && this.creep.store.energy === 0) {
      this.creep.memory.upgrading = false;
      this.creep.say('🔄 harvest');
    }
    if(!this.creep.memory.upgrading && this.creep.store.energy === this.creep.store.getCapacity()) {
      this.creep.memory.upgrading = true;
      this.creep.say('⚡ upgrade');
    }

    if(this.creep.memory.upgrading) {
      if(this.creep.upgradeController(<StructureController>this.creep.room.controller) === ERR_NOT_IN_RANGE) {
        this.creep.moveTo(<StructureController>this.creep.room.controller, {visualizePathStyle: {stroke: '#ffffff'}});
      }
    }
    else {
      if(this.creep.harvest(sources[1]) === ERR_NOT_IN_RANGE) {
        this.creep.moveTo(sources[1], {visualizePathStyle: {stroke: '#ffaa00'}});
      }
    }
  }
}
