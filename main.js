var drawings = [];//the list of things being drawn

class Map{
  constructor(arrOrWidth){//
    if(typeof arrOrWidth == "number"){//it's the width of 
      
    }else{//it's a 2d array
      
    }
  }
}

//personal movement
var thetaX = Math.PI/8;
var thetaY = 0;
var thetaZ = 0;

var move = [1,0];
var worldShift = [0, 0, 0];
var ballSpeed = [0, 0, 0];
var speed = 1/100;

//final objects
var sphere;
var cube;
var cyllinder;
var plane;

var myDrawable = DrawableFactory([
    "vertexPositionBuffer", 
    "vertexColorBuffer", 
    "vertexIndexBuffer", 
    "faceNormalBuffer"
  ]);

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

  mat4.lookAt(mvMatrix, worldShift, sphere.coords, vec3.fromValues(0, 1, 0))


  //loop through drawings and draw
  for(var ii=0;ii<drawings.length;ii++){
    mvPushMatrix();

    mat4.rotate(mvMatrix, mvMatrix, drawings[ii].rotation[0], [1, 0, 0]);
    mat4.rotate(mvMatrix, mvMatrix, drawings[ii].rotation[1], [0, 1, 0]);
    mat4.rotate(mvMatrix, mvMatrix, drawings[ii].rotation[2], [0, 0, 1]);

    mat4.translate(mvMatrix,  mvMatrix, drawings[ii].coords);

    //vertices
    gl.bindBuffer(gl.ARRAY_BUFFER, drawings[ii].shadeObjs.vertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, drawings[ii].shadeObjs.vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0); 

    //coloring
    gl.bindBuffer(gl.ARRAY_BUFFER, drawings[ii].shadeObjs.vertexColorBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, drawings[ii].shadeObjs.vertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);

    //normals
    gl.bindBuffer(gl.ARRAY_BUFFER, drawings[ii].shadeObjs.faceNormalBuffer);
    gl.vertexAttribPointer(shaderProgram.faceNormalAttribute, drawings[ii].shadeObjs.faceNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);

    //vertex index buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, drawings[ii].shadeObjs.vertexIndexBuffer);

    setMatrixUniforms();
    gl.drawElements(drawings[ii].drawMod, drawings[ii].shadeObjs.vertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);

    mvPopMatrix();
  }
}

function tick(){
  requestAnimationFrame(tick);//register next tick

  //set current rotation
  {
    for(var i=0; i<3; i++){
      sphere.coords[i] += ballSpeed[i];
      ballSpeed[i] *= 0.95;
      
      worldShift[i] = sphere.coords[i];
    }
    worldShift[0] +=  4*Math.sin(thetaX)*Math.sin(thetaY);//yRot math
    worldShift[1] +=  4*Math.cos(thetaX);//zRot math
    worldShift[2] +=  4*Math.sin(thetaX)*Math.cos(thetaY);//xRot math
//    worldShift[0] +=  4*Math.cos(thetaY)*Math.sin(thetaX);
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
  
    /*/cyllinder init
    {
      cyllinder = myDrawable.new();
      
      var maxI = 360*4;
      var indecies = 8;
      //walls
      for(var i=0;i<maxI;i++){
        cyllinder.shadeAttribs.vertexPositionBuffer = cyllinder.shadeAttribs.vertexPositionBuffer.concat([//first rectangle
          Math.cos(Math.PI*2*(i/maxI)), 0.0, Math.sin(Math.PI*2*(i/maxI)),
          Math.cos(Math.PI*2*(i/maxI)), 1.0, Math.sin(Math.PI*2*(i/maxI)),

          Math.cos(Math.PI*2*((i+1)/maxI)), 0.0, Math.sin(Math.PI*2*((i+1)/maxI)),
          Math.cos(Math.PI*2*((i+1)/maxI)), 1.0, Math.sin(Math.PI*2*((i+1)/maxI)),

          0, 0, 1,
          0, 1, 1,
          Math.cos(Math.PI*2*(i/maxI)), 0.0, Math.sin(Math.PI*2*(i/maxI)),
          Math.cos(Math.PI*2*(i/maxI)), 1.0, Math.sin(Math.PI*2*(i/maxI))
        ]);
  		
        cyllinder.shadeAttribs.vertexColorBuffer = cyllinder.shadeAttribs.vertexColorBuffer.concat([
          255.0/255.0, 255.0/255.0, 255.0/255.0, 1.0,
          255.0/255.0, 255.0/255.0, 255.0/255.0, 1.0,

          255.0/255.0, 255.0/255.0, 255.0/255.0, 1.0,
          255.0/255.0, 255.0/255.0, 255.0/255.0, 1.0,

          255.0/255.0, 255.0/255.0, 255.0/255.0, 1.0,
          255.0/255.0, 255.0/255.0, 255.0/255.0, 1.0,
          255.0/255.0, 255.0/255.0, 255.0/255.0, 1.0,
          255.0/255.0, 255.0/255.0, 255.0/255.0, 1.0
        ]);
  
        cyllinder.shadeAttribs.vertexIndexBuffer = cyllinder.shadeAttribs.vertexIndexBuffer.concat([
          (indecies*i)%(indecies*maxI), (indecies*i+1)%(indecies*maxI), (indecies*i+2)%(indecies*maxI),
          (indecies*i+3)%(indecies*maxI), (indecies*i+2)%(indecies*maxI), (indecies*i+1)%(indecies*maxI),
          (indecies*i+4)%(indecies*maxI), (indecies*i+6)%(indecies*maxI), ((indecies*(i+1)+6)%(indecies*maxI)),
          (indecies*i+5)%(indecies*maxI), (indecies*i+7)%(indecies*maxI), ((indecies*(i+1)+7)%(indecies*maxI))
        ]);
      }
      
      //top and bottom
      for(var i=0;i<maxI;i++){
        cyllinder.shadeAttribs.vertexPositionBuffer = cyllinder.shadeAttribs.vertexPositionBuffer.concat([
          
        ]);
      }
      cyllinder.shadeAttribs.faceNormalBuffer = generateNormals(cyllinder);
    }
    *///end cyllinder init
    
    //cube init
    {
      cube = cyllinder = myDrawable.new();
    
      
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
            i*width+j, i*width+j+1, i*width+j+2,
            i*width+j+1, i*width+j+3, i*width+j+2
          ]);

          plane.shadeAttribs.faceNormalBuffer = generateNormals(plane);
        }
      }
    }
    //end plane init
    
    //add some items to the drawables
    {
      drawings.push(sphere);
      drawings.push(cube);
    }
    //  end adding
      
    // go through drawings and generate all their buffers
    for(var ii=0; ii<drawings.length; ii++){
      gl.bindBuffer(gl.ARRAY_BUFFER, drawings[ii].shadeObjs.vertexPositionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(drawings[ii].shadeAttribs.vertexPositionBuffer), gl.STATIC_DRAW);
      drawings[ii].shadeObjs.vertexPositionBuffer.itemSize = 3;
      drawings[ii].shadeObjs.vertexPositionBuffer.numItems = drawings[ii].shadeAttribs.vertexPositionBuffer.length/3;
      
      gl.bindBuffer(gl.ARRAY_BUFFER, drawings[ii].shadeObjs.vertexColorBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(drawings[ii].shadeAttribs.vertexColorBuffer), gl.STATIC_DRAW);
      drawings[ii].shadeObjs.vertexColorBuffer.itemSize = 4;
      drawings[ii].shadeObjs.vertexColorBuffer.numItems = drawings[ii].shadeAttribs.vertexColorBuffer.length/4;
  
      gl.bindBuffer(gl.ARRAY_BUFFER, drawings[ii].shadeObjs.faceNormalBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(drawings[ii].shadeAttribs.faceNormalBuffer), gl.STATIC_DRAW);
      drawings[ii].shadeObjs.faceNormalBuffer.itemSize = 3;
      drawings[ii].shadeObjs.faceNormalBuffer.numItems = drawings[ii].shadeAttribs.faceNormalBuffer.length/3;
  
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, drawings[ii].shadeObjs.vertexIndexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(drawings[ii].shadeAttribs.vertexIndexBuffer), gl.STATIC_DRAW);
      drawings[ii].shadeObjs.vertexIndexBuffer.itemSize = 1;
      drawings[ii].shadeObjs.vertexIndexBuffer.numItems = drawings[ii].shadeAttribs.vertexIndexBuffer.length;
    }
    
    console.log(cube);
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
      ballSpeed[0]+=speed*Math.sin(thetaY);
      ballSpeed[2]+=speed*Math.cos(thetaY);
    });

    //W
    registerKeyPress(buttonMove.hold, 87, function(){
      ballSpeed[0]-=speed*Math.sin(thetaY);
      ballSpeed[2]-=speed*Math.cos(thetaY);
    });

    //A
    registerKeyPress(buttonMove.hold, 65, function(){
      ballSpeed[0]-=speed*Math.cos(thetaY);
      ballSpeed[2]+=speed*Math.sin(thetaY);
    });

    //D
    registerKeyPress(buttonMove.hold, 68, function(){
      ballSpeed[0]+=speed*Math.cos(thetaY);
      ballSpeed[2]-=speed*Math.sin(thetaY);
    });
  }


  //gl variables
  {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
  
//    gl.enable(gl.CULL_FACE);
//    gl.cullFace(gl.BACK);
  }


  //begin tick cycle
  tick();
}
//}end code for drawing to screen