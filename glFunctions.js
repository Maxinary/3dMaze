var gl;//the canvas context
var canvas;
var shaderProgram;

//matrices
var mvMatrix = mat4.create();
var mvMatrixStack = [];
var pMatrix = mat4.create();

function DrawableFactory(shaderAttributeNames){
  return {
    "new": function(drawMod, abscoords){
      thisO = {};
      
      if(drawMod === undefined){
        drawMod = gl.TRIANGLES;
        
        if(abscoords === undefined){
          abscoords = [0,0,0];
        }
      }
      thisO.drawMod = drawMod;
      thisO.coords = abscoords;
      thisO.rotation = [0.0, 0.0, 0.0];
      
      thisO.shadeAttribs = {};
      thisO.shadeObjs = {};
      for(var i=0;i<shaderAttributeNames.length;i++){
        thisO.shadeAttribs[shaderAttributeNames[i]] = [];
        thisO.shadeObjs[shaderAttributeNames[i]] = gl.createBuffer();
      }
      thisO.copy = function(){
        return new Drawable(JSON.parse(JSON.stringify(this.shadeAttribs)), this.drawMod, this.coords);
      };
    
      thisO.stretch = function(arr3){
        var o = this.copy().shadeAttribs;
        for(var i=0;i<o.vertexPositionBuffer.length;i+=3){
          for(var j=0;j<3;j++){
            o.vertexPositionBuffer[i+j] = o.vertexPositionBuffer[i+j]*arr3[j];
          }
        }
        return o;
      };
      
      return thisO;
    },
    
    "shaderAttributeNames": shaderAttributeNames,
  };
}


function initGL(){
  try {
    canvas = document.getElementById("cc");
    canvas.width=document.body.clientWidth;
    canvas.height=document.body.clientHeight;
    gl = canvas.getContext("experimental-webgl");
    gl.viewportWidth = canvas.width;
    gl.viewportHeight = canvas.height;
  } catch (e) {
    console.log(e);
  }
  if (!gl) {
    alert("Could not initialise WebGL, sorry :-(");
  }
}

function initShaders(){
  var fragmentShader = getShader(gl, "shader-fs");
    var vertexShader = getShader(gl, "shader-vs");
  
    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
  
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert("Could not initialise shaders");
    }
  
    gl.useProgram(shaderProgram);
  
    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
  
    shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aColor");
    gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);
  
    shaderProgram.faceNormalAttribute = gl.getAttribLocation(shaderProgram, "aNormal");
    gl.enableVertexAttribArray(shaderProgram.faceNormalAttribute);
  
    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
    shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
    shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");
    
    shaderProgram.lightDirection = gl.getUniformLocation(shaderProgram, "lightDirection");
    gl.uniform3fv(shaderProgram.lightDirection, normalize([-1.0, 1.0, 0.0]));
}

//from http://inside.mines.edu/fs_home/gmurray/ArbitraryAxisRotation/
function rotate(x, y, z, u, v, w, theta){
  var squareSum = Math.pow(u, 2.0)+Math.pow(v, 2.0)+Math.pow(w, 2.0);
  var cos = Math.cos(theta);
  var sin = Math.sin(theta);
  var multiplied = u*x+v*y+w*z;
  var sqrSquareSum = Math.sqrt(squareSum);

  return [
    (u*multiplied*(1-cos)+squareSum*x*cos+sqrSquareSum*(-w*y+v*z)*sin)/(squareSum),
    (v*multiplied*(1-cos)+squareSum*y*cos+sqrSquareSum*(w*x-u*z)*sin)/(squareSum),
    (w*multiplied*(1-cos)+squareSum*z*cos+sqrSquareSum*(-v*x+u*y)*sin)/(squareSum)
    ];
}

function lookAt(x,y,z){//returns array of rotations
  
}


function add(arr1, arr2){
  arrOut = [0,0,0];
  for(var i=0;i<arr1.length && i<arr2.length;i++){
    arrOut[i] = arr1[i]+arr2[i];
  }
  return arrOut;
}

function subtract(arr1, arr2){
  arrOut = [0,0,0];

  for(var i=0;i<arr1.length && i<arr2.length;i++){
    arrOut[i] = arr1[i]-arr2[i];
  }
  return arrOut;
}

function cross(a, b){
  return [
    a[1]*b[2] - a[2]*b[1], 
    a[2]*b[0] - a[0]*b[2], 
    a[0]*b[1] - a[1]*b[0]
  ];
}

function normalize(a){
	var sum = 0;
	for(var i=0;i<a.length;i++){
		sum+=Math.abs(a[i]);
	}
	outArr = [];
	for(var i=0;i<a.length;i++){
		outArr.push(a[i]/sum);
	}
	
	return outArr;
}

function trigNormal(a, b, c){//3 points
  edges = [];
  edges.push(subtract(c, b));
  edges.push(subtract(a, b));

  return normalize(cross(edges[0], edges[1]));
}

function generateNormals(shape){
  var faceNormalBuffer = [];
  for(var i=0; i<shape.shadeAttribs.vertexIndexBuffer.length; i+=3){
    var points = [];
    for(var j=0; j<3; j++){
      var point = [];
      for(var k=0; k<3; k++){
        point.push(shape.shadeAttribs.vertexPositionBuffer[shape.shadeAttribs.vertexIndexBuffer[i+j]*3+k]);
      }
      points.push(point);
    }

    var c = trigNormal(points[0], points[1], points[2]);
    
    c = c.concat(c);
    
    faceNormalBuffer = faceNormalBuffer.concat(
      c
    );
  }
  return faceNormalBuffer;
}


//code for opengl interfacing{
function getShader(gl, id) {
  var shaderScript = document.getElementById(id);
  if (!shaderScript) {
    return null;
  }

  var str = "";
  var k = shaderScript.firstChild;
  while (k) {
    if (k.nodeType == 3) {
      str += k.textContent;
    }
    k = k.nextSibling;
  }

  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }

  gl.shaderSource(shader, str);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  }

  return shader;
}

function setMatrixUniforms() {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
  var normalMatrix = mat3.create();
  mat3.normalFromMat4(normalMatrix, mvMatrix);
  gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, normalMatrix);
}

function mvPushMatrix() {
  var copy = mat4.create();
  mat4.copy(copy, mvMatrix);
  mvMatrixStack.push(copy);
}

function mvPopMatrix() {
  if (mvMatrixStack.length === 0) {
    throw "Invalid popMatrix!";
  }
  mvMatrix = mvMatrixStack.pop();
}
//}end opengl interfacing code
