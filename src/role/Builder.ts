export class Builder{
  creep:Creep

  // 结构类型优先级映射表，数字越小优先级越高
  structurePriority: { [key: string]: number } = {
    [STRUCTURE_CONTAINER]: 2,
    [STRUCTURE_EXTENSION]: 0,
    [STRUCTURE_RAMPART]: 3,
    [STRUCTURE_ROAD]: 1,
    [STRUCTURE_LINK]: 4
  };

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



        targets.sort((a, b) => {
          // 获取类型优先级，未定义的类型优先级为Infinity
          const a_priority = this.structurePriority[a.structureType] ?? Infinity;
          const b_priority = this.structurePriority[b.structureType] ?? Infinity;

          // 先按类型优先级排序
          if (a_priority !== b_priority) {
            return a_priority - b_priority;
          }

          // 优先级相同时按距离排序
          const a_distance = Math.abs(this.creep.pos.x - a.pos.x) + Math.abs(this.creep.pos.y - a.pos.y);
          const b_distance = Math.abs(this.creep.pos.x - b.pos.x) + Math.abs(this.creep.pos.y - b.pos.y);
          return a_distance - b_distance;
        })
        if(this.creep.build(targets[0]) == ERR_NOT_IN_RANGE) {
          this.creep.moveTo(targets[0], {visualizePathStyle: {stroke: '#ffffff'}});
        }
      }
    }
    else {
      if(this.creep.harvest(sources[0]) == ERR_NOT_IN_RANGE) {
        this.creep.moveTo(sources[0], {visualizePathStyle: {stroke: '#ffaa00'}});
      }
    }
  }
}
