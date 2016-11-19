buttonMove = {down:0, up:1, hold:2};

class KeyRegister{
  constructor(){
    this.upFunctions = {};
    this.downFunctions = {};
    this.holdFunctions = {};
    this.keys = {};
  }
  
  registerKeyPress(btnMove, buttonID, funct){
    if(btnMove == 1){
      if(this.upFunctions[buttonID.toString()]===undefined){
        this.upFunctions[buttonID.toString()] = [];
      }
      this.upFunctions[this.buttonID.toString()].push(funct);
    }else if(btnMove === 0){
      if(this.downFunctions[buttonID.toString()]===undefined){
        this.downFunctions[buttonID.toString()] = [];
      }
      this.downFunctions[buttonID.toString()].push(funct);
    }else{
      this.keys[buttonID.toString()] = false;
      if(this.holdFunctions[buttonID.toString()]===undefined){
        this.holdFunctions[buttonID.toString()] = [];
      }
      this.holdFunctions[buttonID.toString()].push(funct);
    }
  }
  
  engage(){
    document.onkeydown = function(thisKeyReg){
      return function(e){
        thisKeyReg.keys[e.keyCode.toString()] = true;
        if(thisKeyReg.downFunctions[e.keyCode.toString()]!==undefined){
          for(var i=0;i<thisKeyReg.downFunctions[e.keyCode.toString()].length; i++){
            thisKeyReg.downFunctions[e.keyCode.toString()][i]();
          }
        }
      };
    }(this);
    
    document.onkeyup = function(thisKeyReg){
      return function(e){
        thisKeyReg.keys[e.keyCode.toString()] = false;
      
        if(thisKeyReg.upFunctions[e.code]!==undefined){
          for(var i=0;i<thisKeyReg.downFunctions.length; i++){
            thisKeyReg.upFunctions[e.code][i]();
          }
        }
      };
    }(this);
  }
  
  keyTick(){
    for(var i in this.holdFunctions){
      if(this.holdFunctions[i]!==undefined){
        if(this.keys[i] === true){
          for(var j=0;j<this.holdFunctions[i].length;j++){
            this.holdFunctions[i][j]();
          }
        }
      }
    }
  }
}