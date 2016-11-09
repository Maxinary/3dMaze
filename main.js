var drawings = [];//the list of things being drawn

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
  }
  
  touch(otherPhysObj){
    if(this.interactFns[otherPhysObj.name] !== undefined){
      return this.interactFns[otherPhysObj.name](this, otherPhysObj);
    }else{
      return [0, 0, 0];
    }
  }
  
  copy(){
    var n = new PhysObj(this.name, this.draw.copy());
    for(var key in this.interactFns){
      n.interactFns[key] = this.interactFns[key];
    }
    return n;
  }
}

//personal movement
var thetaX = Math.PI*7/16;
var thetaY = 0;
var thetaZ = 0;

var move = [1,0];
var worldShift = [0, 0, 0];
var ballSpeed = [0, 0, 0];
var speed = 1/100;

//final objects
var sphere;
var cube;
var plane;

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

//code for actually drawing and running{
function drawScene(){
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

function tick(){
  requestAnimationFrame(tick);//register next tick

  //set current rotation
  {
    for(var i=0; i<3; i++){
      worldShift[i] = drawings[0].draw.coords[i];
    }
    worldShift[0] +=  8*Math.sin(thetaX)*Math.sin(thetaY);//yRot math
    worldShift[1] +=  8*Math.cos(thetaX);//zRot math
    worldShift[2] +=  8*Math.sin(thetaX)*Math.cos(thetaY);//xRot math
  }
  
  //movement
  {
    for(var i=0;i<drawings.length;i++){
      for(var j=0;j<3;j++){
        drawings[i].draw.coords[j] += drawings[i].velocity[j];
        drawings[i].velocity[j] *= 0.975;
      }
    }
  }
  
  //collision
  {
    for(var i=0;i<drawings.length;i++){
      for(var j=0;j<drawings.length;j++){
        var hits = drawings[i].touch(drawings[j]);
        if(hits[0] != 0 && hits[0] != 0 && hits[0] != 0){
          hits = normalize(hits);
          for(var k=0;k<3;k++){
            drawings[i].velocity[k] += hits[k]/20;
          }
        }
      }
    }
  }
  
  //check keys and values from keyRegisterer.js
  keyTick();
  
  //draw
  drawScene();
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
  
      //cube.shadeAttribs.faceNormalBuffer = [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0];
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
        var ball = new PhysObj("ball", sphere.copy());
        ball.interactFns["ball"] = function(mine, physO){
          if(Math.sqrt(Math.pow(mine.draw.coords[0]-physO.draw.coords[0], 2) + Math.pow(mine.draw.coords[1]-physO.draw.coords[1], 2) + Math.pow(mine.draw.coords[2]-physO.draw.coords[2], 2) ) < ball.draw.stretchRegister[0]+physO.draw.stretchRegister[0]){
            return [mine.draw.coords[0]-physO.draw.coords[0], mine.draw.coords[1]-physO.draw.coords[1], mine.draw.coords[2]-physO.draw.coords[2]];
          }else{
            return [0, 0, 0];
          }
        };
        ball.interactFns["cube"] = function(mine, cube){
          var touchSides = [0,0,0];
          for(var i=0; i<3; i++){
            if(cube.draw.stretchRegister[0]){
              
            }
          }
        };
        var ki = ball.copy();
        ki.draw = myDrawable.customFunctions.setColor(sphere.copy(), [1, 0, 0, 1]);
        ki.draw.coords[0] = 3;
        drawings.push(ball.copy());
        drawings.push(ki);
      }
      
  	  {
  		  var k = plane.copy();
  		  k = k.stretch([5, -1, 5]);
  		  k.coords = [-50, -1, -50];
  		  drawings.push(new PhysObj("plane",k));
  	  }
      drawings.push(new PhysObj("cube", cube.copy().stretch([2,2,2])));
    }
    //  end adding
      
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


  //register key presses with keyregisterer.js
  {
    //rotate
    registerKeyPress(buttonMove.hold, 37, function(){thetaY-=0.02;});
    registerKeyPress(buttonMove.hold, 38, function(){thetaX-=0.02;});
    registerKeyPress(buttonMove.hold, 39, function(){thetaY+=0.02;});
    registerKeyPress(buttonMove.hold, 40, function(){thetaX+=0.02;});
  
    //S
    registerKeyPress(buttonMove.hold, 83, function(){
      drawings[0].velocity[0]+=speed*Math.sin(thetaY);
      drawings[0].velocity[2]+=speed*Math.cos(thetaY);
    });

    //W
    registerKeyPress(buttonMove.hold, 87, function(){
      drawings[0].velocity[0]-=speed*Math.sin(thetaY);
      drawings[0].velocity[2]-=speed*Math.cos(thetaY);
    });

    //A
    registerKeyPress(buttonMove.hold, 65, function(){
      drawings[0].velocity[0]-=speed*Math.cos(thetaY);
      drawings[0].velocity[2]+=speed*Math.sin(thetaY);
    });

    //D
    registerKeyPress(buttonMove.hold, 68, function(){
      drawings[0].velocity[0]+=speed*Math.cos(thetaY);
      drawings[0].velocity[2]-=speed*Math.sin(thetaY);
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