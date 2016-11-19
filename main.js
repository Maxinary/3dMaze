var drawings = [];//the list of things being drawn

function squared(x){return x*x;}

function shuffle(arr){
  for(var i=0;i<arr.length;i++){
    var ind = Math.floor(Math.random()*arr.length);
    var temp = arr[i];
    arr[i] = arr[ind];
    arr[ind] = temp;
  }
  return arr;
}

class PhysObj{
  constructor(objName, drawableAttr, mass){
    if(mass === undefined){
      mass = 1;
    }
    this.name = objName;
    this.interactFns = {};//each fn should return a vector of interaction normal
    this.draw = drawableAttr;
    this.velocity = [0,0,0];
    this.mass = mass;
    this.extraData = {};
  }
  
  touch(otherPhysObj){
    if(this.interactFns[otherPhysObj.name] !== undefined){
      return this.interactFns[otherPhysObj.name](this, otherPhysObj);
    }else{
      return [0, 0, 0];
    }
  }
  
  copy(){
    var n = new PhysObj(this.name, this.draw.copy(), this.mass);
    for(var key in this.interactFns){
      n.interactFns[key] = this.interactFns[key];
    }
    return n;
  }
}

class Maze{
  constructor(width, height){
    this.drawMap = []
    this.map = [];
    for(var i=0; i<width; i++){
      this.map.push([]);
      for(var j=0; j<height; j++){
        this.map[i].push(1);
      }
    }
    
    this.generate(0,0);
  }
  
  generate(x0, y0){
    var pos_stack = [[x0,y0]];
    
    while(pos_stack.length > 0){
      this.map[pos_stack[pos_stack.length-1][0]][pos_stack[pos_stack.length-1][1]] = 0;

      var x = pos_stack[pos_stack.length-1][0];
      var y = pos_stack[pos_stack.length-1][1];
      
      var k = shuffle([[-1, 0], [0, -1], [1, 0], [0, 1]]);
      var left = false;
      for(var i=0; i<k.length && left === false; i++){
        var positions = [x+k[i][0], y+k[i][1]];
        if(this.exists(positions[0], positions[1]) && this.map[positions[0]][positions[1]] == 1 && this.neighbors(positions[0], positions[1]) > 6){
          pos_stack.push(positions);
          left = true;
        }
      }
      if(left === false){
        pos_stack.pop();
      }
    }
  }
  
  exists(x, y){
    return x >= 0 && x < this.map.length && y >= 0 && y < this.map[x].length;
  }
  
  neighbors(x, y){
    var count = 0;
    for(var i=-1; i<2; i++){
      for(var j=-1; j<2; j++){
        if(!this.exists(x+i, y+j) || this.map[x+i][y+j] == 1){
          count++;
        }
      }
    }
    return count;
  }
  
  toPhysArray(){
    var pCube = new PhysObj("cube", cube.copy().stretch([4,4,4]));
    var out = [];
    for(var i=-1; i<=this.map.length; i++){
      this.drawMap.push([]);
      for(var j=-1; j<=this.map[0].length; j++){
        if((i == -1 || j == -1 || i == this.map.length || j == this.map[0].length || this.map[i][j] == 1) && (i+j < this.map.length + this.map[0].length - 1)){
          var tempC = pCube.copy();
          var color = 2*(i+j)/(this.map.length+this.map[0].length);
          tempC.draw = myDrawable.customFunctions.setColor(tempC.draw, [color*2, color/3, color/2, 1]);
          tempC.draw.coords = [4*i, 0, 4*j];
          out.push(tempC);
          this.drawMap[i+1].push(tempC);
        }else{
          this.drawMap[i+1].push(undefined);
        }
      }
    }
    return out;
  }
  
  toSinglePhysObj(){
    var outArr = this.toPhysArray();
    
    var outDraw = myDrawable.new();
    
    var totalCount = 0;
    
    for(var i=0; i<outArr.length; i++){
      outDraw.shadeAttribs.faceNormalBuffer.push.apply(outDraw.shadeAttribs.faceNormalBuffer, outArr[i].draw.shadeAttribs.faceNormalBuffer);
      outDraw.shadeAttribs.vertexColorBuffer.push.apply(outDraw.shadeAttribs.vertexColorBuffer, outArr[i].draw.shadeAttribs.vertexColorBuffer);
      
      for(var j=0; j<outArr[i].draw.shadeAttribs.vertexPositionBuffer.length; j+=3){
        for(var k=0; k<3; k++){
          outDraw.shadeAttribs.vertexPositionBuffer.push(outArr[i].draw.shadeAttribs.vertexPositionBuffer[j+k]+outArr[i].draw.coords[k]);
        }
      }
      
      for(var j=0; j<outArr[i].draw.shadeAttribs.vertexIndexBuffer.length; j++){
        outDraw.shadeAttribs.vertexIndexBuffer.push(outArr[i].draw.shadeAttribs.vertexIndexBuffer[j]+totalCount);
      }
      
      totalCount += 24;
    }
    
    
    
    var outPhys = new PhysObj("cubeArr", myDrawable.customFunctions.setColorByVertex(outDraw, function(coord){
      return [(coord[0]+coord[2])/64/1.3, 0, (coord[0]+coord[2])/64/3, 1];
    }), 5000);
    outPhys.extraData.map = this.map;
    
    
    return outPhys;
  }
}

//personal movement
var thetaX = Math.PI*7/16;
var thetaY = 0;
var thetaZ = 0;
var cameraDistance = 8;

var move = [1,0];
var worldShift = [0, 0, 0];
var ballSpeed = [0, 0, 0];
var speed = 1/30;

class WorldState{
  constructor(drawings, keyReg, tickCode){
    this.drawings = drawings;
    this.keyReg = keyReg;
    this.tick = tickCode;
  }
}

var gameStates = {};
var curGameState = "run";

//final objects
var sphere;
var cube;
var plane;

var maze;

var currentGameState;

var myDrawable = DrawableFactory([
    "vertexPositionBuffer", 
    "vertexColorBuffer", 
    "vertexIndexBuffer", 
    "faceNormalBuffer"
  ]);

myDrawable.customFunctions.setColor = function(myDrawableO, colorArr){
  for(var i=0;i<myDrawableO.shadeAttribs.vertexColorBuffer.length;i+=4){
    for(var j=0; j<4; j++){
      myDrawableO.shadeAttribs.vertexColorBuffer[i+j] = colorArr[j];
    }
  }
  return myDrawableO;
};

myDrawable.customFunctions.setColorByVertex = function(myDrawableO, colorFunc){
  for(var i=0; i<myDrawableO.shadeAttribs.vertexIndexBuffer.length; i++){
    var cArr = colorFunc(
      myDrawableO.shadeAttribs.vertexPositionBuffer.slice(
        myDrawableO.shadeAttribs.vertexIndexBuffer[i]*3, 
        myDrawableO.shadeAttribs.vertexIndexBuffer[i]*3+3
      )
    );
    
    for(var j=0; j<4; j++){
      myDrawableO.shadeAttribs.vertexColorBuffer[myDrawableO.shadeAttribs.vertexIndexBuffer[i]*4+j] = cArr[j];
    }
  }
  return myDrawableO;
}

//code for actually drawing and running{

function tick(){
  requestAnimationFrame(tick);//register next tick
  
  gameStates[curGameState].tick();
  
  //check keys and values from keyRegisterer.js
  gameStates[curGameState].keyReg.keyTick();
  
  //draw
  {
    //clear screen
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.clearColor(0, 0, 0, 0.3);
  
    //set up view model
    mat4.perspective(pMatrix, 45.0, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0);
  
    mat4.identity(mvMatrix);
  
    //intial camera movement
  
    mat4.translate(mvMatrix, mvMatrix, [0,0,-5]);//got sphere
  
    mat4.lookAt(mvMatrix, worldShift, drawings[0].draw.coords, vec3.fromValues(0, 1, 0))
  
  
    //loop through drawings and draw
    for(var ii=0;ii<drawings.length;ii++){
      mvPushMatrix();
  	
  	  var rotationMatrix = mat4.create();
  	
      mat4.rotate(rotationMatrix, rotationMatrix, drawings[ii].draw.rotation[0], [1, 0, 0]);
      mat4.rotate(rotationMatrix, rotationMatrix, drawings[ii].draw.rotation[1], [0, 1, 0]);
      mat4.rotate(rotationMatrix, rotationMatrix, drawings[ii].draw.rotation[2], [0, 0, 1]);
  
      mat4.translate(mvMatrix,  mvMatrix, drawings[ii].draw.coords);
  
      //vertices
      gl.bindBuffer(gl.ARRAY_BUFFER, drawings[ii].draw.shadeObjs.vertexPositionBuffer);
      gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, drawings[ii].draw.shadeObjs.vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0); 
  
      //coloring
      gl.bindBuffer(gl.ARRAY_BUFFER, drawings[ii].draw.shadeObjs.vertexColorBuffer);
      gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, drawings[ii].draw.shadeObjs.vertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);
  
      //normals
      gl.bindBuffer(gl.ARRAY_BUFFER, drawings[ii].draw.shadeObjs.faceNormalBuffer);
      gl.vertexAttribPointer(shaderProgram.faceNormalAttribute, drawings[ii].draw.shadeObjs.faceNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);
  
      //vertex index buffer
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, drawings[ii].draw.shadeObjs.vertexIndexBuffer);
  
      setMatrixUniforms(rotationMatrix);
      gl.drawElements(drawings[ii].draw.drawMod, drawings[ii].draw.shadeObjs.vertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
  
      mvPopMatrix();
    }
  }
}

function webGLStart() {
  //init GL
  initGL();
  
  //init shaders
  //so those vars fragmentShader and vertexShader get removed later
  initShaders();
  
  
  //init buffers
  {
    //init sphere
    {
      sphere = myDrawable.new();
      
      sphere.shadeAttribs.vertexPositionBuffer = sphereDat.points;
      sphere.shadeAttribs.vertexIndexBuffer = sphereDat.index;
      
      for(var i=0; i<sphere.shadeAttribs.vertexPositionBuffer.length; i+=3){
        sphere.shadeAttribs.vertexColorBuffer = sphere.shadeAttribs.vertexColorBuffer.concat([1, 0, 1, 1]);
      }
      
      sphere.shadeAttribs.faceNormalBuffer = sphereDat.normal;
    }
    //end sphere init
    
    //cube init
    {
      cube = myDrawable.new();
    
      
      cube.shadeAttribs.vertexIndexBuffer = [0, 1, 2, 2, 1, 3, 4, 5, 6, 6, 5, 7, 8, 9, 10, 10, 9, 11, 12, 13, 14, 14, 13, 15, 16, 17, 18, 18, 17, 19, 20, 21, 22, 22, 21, 23];
      cube.shadeAttribs.vertexPositionBuffer = [-0.5, -0.5, 0.5, 0.5, -0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5, -0.5, -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5];
      cube.shadeAttribs.faceNormalBuffer = generateNormals(cube);
      
      for(var i=0; i<cube.shadeAttribs.vertexPositionBuffer.length;i++){
        cube.shadeAttribs.vertexColorBuffer = cube.shadeAttribs.vertexColorBuffer.concat([0.0, 0.0, 1.0, 1.0]);
      }
    }
    ///end cube init
    
    //plane init 
    {
      plane = myDrawable.new();
      
      var width = 20;
      var indecies = 4;
      for(var i=0;i<width;i++){
        for(var j=0;j<width;j++){
          plane.shadeAttribs.vertexPositionBuffer = plane.shadeAttribs.vertexPositionBuffer.concat([
            i, 0, j,
            i+1, 0, j,
            i, 0, j+1,
            i+1, 0, j+1
          ]);
          
          plane.shadeAttribs.vertexColorBuffer = plane.shadeAttribs.vertexColorBuffer.concat([
            0.9, 0.9, 0.9, 1.0,
            0.9, 0.9, 0.9, 1.0,
            0.9, 0.9, 0.9, 1.0,
            0.9, 0.9, 0.9, 1.0
          ]);
          
          plane.shadeAttribs.vertexIndexBuffer = plane.shadeAttribs.vertexIndexBuffer.concat([
            indecies*(i*width+j), indecies*(i*width+j)+2, indecies*(i*width+j)+1,
            indecies*(i*width+j)+1, indecies*(i*width+j)+2, indecies*(i*width+j)+3
          ]);
    
          plane.shadeAttribs.faceNormalBuffer = generateNormals(plane);
        }
      }
    }
    //end plane init

    
    //add some items to the drawables
    {
      {
        var ball = new PhysObj("ball", sphere.copy(), 3);
        ball.interactFns["ball"] = function(mine, physO){
          if(Math.sqrt(Math.pow(mine.draw.coords[0]-physO.draw.coords[0], 2) + Math.pow(mine.draw.coords[1]-physO.draw.coords[1], 2) + Math.pow(mine.draw.coords[2]-physO.draw.coords[2], 2) ) < ball.draw.stretchRegister[0]+physO.draw.stretchRegister[0]){
            return [mine.draw.coords[0]-physO.draw.coords[0], mine.draw.coords[1]-physO.draw.coords[1], mine.draw.coords[2]-physO.draw.coords[2]];
          }else{
            return [0, 0, 0];
          }
        };
        ball.interactFns["cube"] = function(mine, cube){
          var touchSides = [0,0,0];
          var maxIndex = 0;
          var maxValue = 0;
          var touching = true;
          for(var i=0; i<3; i++){
            if(Math.abs(cube.draw.coords[i] - mine.draw.coords[i]) < 4*mine.draw.stretchRegister[i] &&
              (Math.abs((cube.draw.coords[i] + cube.draw.stretchRegister[i]) - mine.draw.coords[i]) <= 2*mine.draw.stretchRegister[i] ||
               Math.abs((cube.draw.coords[i] - cube.draw.stretchRegister[i]) - mine.draw.coords[i]) <= 2*mine.draw.stretchRegister[i])){
              
              if(Math.abs((cube.draw.coords[i] - mine.draw.coords[i])) > Math.abs(maxValue)){
                maxValue = (cube.draw.coords[i] - mine.draw.coords[i]);
                maxIndex = i;
              }
            }else{
              return [0,0,0];
            }
          }
          
          if(touching){
            var opposing = 0;
            if(maxValue < 0){
              opposing = 1;
            }else{
              opposing = -1;
            }
            touchSides[maxIndex] = (opposing + maxValue/(1.5*(cube.draw.stretchRegister[maxIndex]+mine.draw.stretchRegister[maxIndex])));
            console.log(touchSides[maxIndex]);
            return touchSides;
          }else{
            return [0, 0, 0];
          }
        };
        drawings.push(ball.copy());
      }
      
  	  {
  		  var k = plane.copy();
  		  k = k.stretch([20, -1, 20]);
  		  k.coords = [-4, -1, -4];
  		  drawings.push(new PhysObj("plane",k));
  	  }
  	  
  	  {
        maze = new Maze(30,30);

  	    var k = maze.toSinglePhysObj();
        drawings = drawings.concat(k);
  	  }
    }
    //end adding
      
    // go through drawings and generate all their buffers
    for(var ii=0; ii<drawings.length; ii++){
      gl.bindBuffer(gl.ARRAY_BUFFER, drawings[ii].draw.shadeObjs.vertexPositionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(drawings[ii].draw.shadeAttribs.vertexPositionBuffer), gl.STATIC_DRAW);
      drawings[ii].draw.shadeObjs.vertexPositionBuffer.itemSize = 3;
      drawings[ii].draw.shadeObjs.vertexPositionBuffer.numItems = drawings[ii].draw.shadeAttribs.vertexPositionBuffer.length/3;
      
      gl.bindBuffer(gl.ARRAY_BUFFER, drawings[ii].draw.shadeObjs.vertexColorBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(drawings[ii].draw.shadeAttribs.vertexColorBuffer), gl.STATIC_DRAW);
      drawings[ii].draw.shadeObjs.vertexColorBuffer.itemSize = 4;
      drawings[ii].draw.shadeObjs.vertexColorBuffer.numItems = drawings[ii].draw.shadeAttribs.vertexColorBuffer.length/4;
  
      gl.bindBuffer(gl.ARRAY_BUFFER, drawings[ii].draw.shadeObjs.faceNormalBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(drawings[ii].draw.shadeAttribs.faceNormalBuffer), gl.STATIC_DRAW);
      drawings[ii].draw.shadeObjs.faceNormalBuffer.itemSize = 3;
      drawings[ii].draw.shadeObjs.faceNormalBuffer.numItems = drawings[ii].draw.shadeAttribs.faceNormalBuffer.length/3;
  
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, drawings[ii].draw.shadeObjs.vertexIndexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(drawings[ii].draw.shadeAttribs.vertexIndexBuffer), gl.STATIC_DRAW);
      drawings[ii].draw.shadeObjs.vertexIndexBuffer.itemSize = 1;
      drawings[ii].draw.shadeObjs.vertexIndexBuffer.numItems = drawings[ii].draw.shadeAttribs.vertexIndexBuffer.length;
    }
    
    console.log(drawings);
  }


  //initialize the playtime game state
  {
    var gameKeys = new KeyRegister();
    {
      //rotate
      gameKeys.registerKeyPress(buttonMove.hold, 37, function(){thetaY-=0.02;});
      gameKeys.registerKeyPress(buttonMove.hold, 38, function(){thetaX-=0.02;});
      gameKeys.registerKeyPress(buttonMove.hold, 39, function(){thetaY+=0.02;});
      gameKeys.registerKeyPress(buttonMove.hold, 40, function(){thetaX+=0.02;});
    
      //S
      gameKeys.registerKeyPress(buttonMove.hold, 83, function(){
        drawings[0].velocity[0]+=speed*Math.sin(thetaY);
        drawings[0].velocity[2]+=speed*Math.cos(thetaY);
      });
  
      //W
      gameKeys.registerKeyPress(buttonMove.hold, 87, function(){
        drawings[0].velocity[0]-=speed*Math.sin(thetaY);
        drawings[0].velocity[2]-=speed*Math.cos(thetaY);
      });
  
      //A
      gameKeys.registerKeyPress(buttonMove.hold, 65, function(){
        drawings[0].velocity[0]-=speed*Math.cos(thetaY);
        drawings[0].velocity[2]+=speed*Math.sin(thetaY);
      });
  
      //D
      gameKeys.registerKeyPress(buttonMove.hold, 68, function(){
        drawings[0].velocity[0]+=speed*Math.cos(thetaY);
        drawings[0].velocity[2]-=speed*Math.sin(thetaY);
      });
    }
    
    gameKeys.engage();
    
    gameStates["run"] = new WorldState(drawings, gameKeys, function(){//physics
      {
        //movement
        {
          for(var i=0;i<drawings.length;i++){
            for(var j=0;j<3;j++){
              this.drawings[i].draw.coords[j] += drawings[i].velocity[j];
              this.drawings[i].velocity[j] *= 0.85;
            }
          }
        }
        
        //collision
        //NOTE: collision is modified to minimize checks
        {
          //get position
          var coord = [1,0,1];
          for(var i=0;i<3;i++){
            coord[i] += Math.floor(this.drawings[0].draw.coords[i]/4);
          }
          
          //hits maze
          for(var i=-1;i<2;i++){
            for(var j=-1;j<2;j++){
              if(maze.drawMap[i+coord[0]] !== undefined && maze.drawMap[i+coord[0]][j+coord[2]] !== undefined){
                var hits = this.drawings[0].touch(maze.drawMap[i+coord[0]][j+coord[2]]);
                if(hits[0] !== 0 || hits[1] !== 0 || hits[2] !== 0){
                  for(var k=0;k<3;k++){
                    this.drawings[0].velocity[k] += hits[k]/this.drawings[0].mass;
                  }
                }
              }
            }
          }
        }
      }
      
      //set current rotation
      {
        for(var i=0; i<3; i++){
          worldShift[i] = drawings[0].draw.coords[i];
        }
        worldShift[0] +=  cameraDistance*Math.sin(thetaX)*Math.sin(thetaY);//yRot math
        worldShift[1] +=  cameraDistance*Math.cos(thetaX);//zRot math
        worldShift[2] +=  cameraDistance*Math.sin(thetaX)*Math.cos(thetaY);//xRot math
      }
    });
  }

  //gl variables
  {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
  
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
  }


  //begin tick cycle
  tick();
}
//}end code for drawing
