export class Builder{
  creep:Creep

  constructor(creep: Creep) {
    this.creep = creep;
  }

  build(sources:Array<Source>){
    if(this.creep.memory.building && this.creep.store.getUsedCapacity() == 0) {
      this.creep.memory.building = false;
      this.creep.say('🔄 harvest');
    }
    if(!this.creep.memory.building && this.creep.store.getUsedCapacity() == this.creep.store.getCapacity()) {
      this.creep.memory.building = true;
      this.creep.say('🚧 build');
    }

    if(this.creep.memory.building) {
      var targets = this.creep.room.find(FIND_CONSTRUCTION_SITES);
      if(targets.length) {

        targets.sort((a, b) =>{
          const a_distance = Math.abs(this.creep.pos.x - a.pos.x) + Math.abs(this.creep.pos.y - a.pos.y);
          const b_distance = Math.abs(this.creep.pos.x - b.pos.x) + Math.abs(this.creep.pos.y - b.pos.y);
          return a_distance-b_distance})
        if(this.creep.build(targets[0]) == ERR_NOT_IN_RANGE) {
          this.creep.moveTo(targets[0], {visualizePathStyle: {stroke: '#ffffff'}});
        }
      }
    }
    else {
      if(this.creep.harvest(sources[1]) == ERR_NOT_IN_RANGE) {
        this.creep.moveTo(sources[1], {visualizePathStyle: {stroke: '#ffaa00'}});
      }
    }
  }
}
