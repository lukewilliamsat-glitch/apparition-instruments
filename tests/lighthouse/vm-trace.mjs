import vm from 'node:vm';
const evaluate=vm.Module.prototype.evaluate;
vm.Module.prototype.evaluate=function(...args){process.stderr.write('VM evaluate '+this.identifier+'\n');return evaluate.apply(this,args);};
