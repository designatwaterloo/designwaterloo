// Rounded solids built from the SVG's actual Bezier silhouettes.
// Counters are contour ink on the surface, not holes through the solid.
const vertex = `attribute vec2 position; void main(){gl_Position=vec4(position,0.,1.);}`;
const fragment = `precision highp float;
uniform vec2 resolution;
uniform float angle;
uniform vec3 ink;
uniform sampler2D contours;
float smoothUnion(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
vec3 offset(float side){return side*vec3(.914*cos(angle),0.,.914*sin(angle));}
// Weak perspective: depth changes apparent size without tilting the letters.
vec3 localPoint(vec3 p,float side){
 vec3 o=offset(side);float scale=8./(8.-o.z);
 return vec3((p.xy-o.xy*scale)/scale,p.z-o.z);
}
vec2 contourAt(vec2 p){
 vec2 uv=vec2(p.x/4.8+.5,.5-p.y/3.);
 return (texture2D(contours,clamp(uv,vec2(0.),vec2(1.))).rg*255.-128.)/160.;
}
// Each horizontal ray intersects quadratic rounded surfaces. Solve those
// intersections directly instead of marching an approximate distance field.
float profile(vec2 p,float side){
 vec3 q=localPoint(vec3(p,0.),side);
 vec2 original=q.xy+vec2(side*.914,0.);
 float joined=max(contourAt(original).x,-side*original.x);
 float freeSide=contourAt(vec2(side*(.914+abs(q.x)),q.y)).x;
 float separation=length(offset(side)-vec3(side*.914,0.,0.));
 return mix(joined,freeSide,smoothstep(0.,.8,separation));
}
float bridgeRoot(float z,float m,float n,float k){
 return abs(m*z+n)<=k+.00001?z:-100.;
}
float coverageAt(vec2 uv){
 float da=profile(uv,-1.),db=profile(uv,1.);
 float za=offset(-1.).z,zb=offset(1.).z;
 float separation=length(offset(1.)-vec3(.914,0.,0.));
 float k=mix(.001,.48,smoothstep(0.,.8,separation));
 float r=.95,z=-100.;
 if(da<=0.)z=max(z,za+sqrt(-da/r));
 if(db<=0.)z=max(z,zb+sqrt(-db/r));
 // Within the smooth-union interval the field is another quadratic.
 float m=2.*r*(zb-za),n=r*(za*za-zb*zb)+da-db;
 float a=r-m*m/(4.*k);
 float b=-r*(za+zb)-m*n/(2.*k);
 float c=.5*(r*(za*za+zb*zb)+da+db)-k*.25-n*n/(4.*k);
 if(abs(a)<.00001){
  if(abs(b)>.00001)z=max(z,bridgeRoot(-c/b,m,n,k));
 }else{
  float discriminant=b*b-4.*a*c;
  if(discriminant>=0.){
   float root=sqrt(discriminant);
   // Stable quadratic formula avoids cancellation near tangent rays.
   float q=-.5*(b+(b>=0.?root:-root));
   if(abs(q)>.0000001){
    z=max(z,bridgeRoot(q/a,m,n,k));
    z=max(z,bridgeRoot(c/q,m,n,k));
   }else z=max(z,bridgeRoot(-b/(2.*a),m,n,k));
  }
 }
 if(z< -10.)return 0.;
 vec3 p=vec3(uv,z);
 float fieldA=da+r*(z-za)*(z-za),fieldB=db+r*(z-zb)*(z-zb);
 float blend=clamp(.5+.5*(fieldB-fieldA)/k,0.,1.);
 vec3 qa=localPoint(p,-1.),qb=localPoint(p,1.);
 float counterA=contourAt(qa.xy-vec2(.914,0.)).y;
 float counterB=contourAt(qb.xy+vec2(.914,0.)).y;
 // Use the same continuous blend for the material and the solid. A hard
// nearest-lobe choice creates transparent slivers when surface ownership flips.
 float counter=mix(counterB,counterA,blend);
 float pixel=4.8/resolution.x;
 float surface=smoothstep(-pixel*.5,pixel*.5,counter);
 // Transparent contour material does not occlude ink on the other lobe.
 float throughA=da<=0.?smoothstep(-pixel*.5,pixel*.5,counterA):0.;
 float throughB=db<=0.?smoothstep(-pixel*.5,pixel*.5,counterB):0.;
 return max(da>0.&&db>0.?1.:0.,max(throughA,throughB));
}
void main(){
 vec2 uv=(gl_FragCoord.xy/resolution-.5)*vec2(4.8,3.);
 vec2 halfSample=vec2(4.8,3.)/resolution*.25;
 float coverage=(coverageAt(uv+halfSample)+coverageAt(uv-halfSample)
  +coverageAt(uv+vec2(halfSample.x,-halfSample.y))
  +coverageAt(uv+vec2(-halfSample.x,halfSample.y)))*.25;
 gl_FragColor=vec4(ink,coverage);
}`;

export async function createVolume(canvas: HTMLCanvasElement) {
  const source = new Image();
  source.src = '/wordmark-contours.png';
  try { await source.decode(); } catch { return null; }
  const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false});
  if(!gl) return null;
  const shaders: WebGLShader[]=[];
  const compile=(type:number,source:string)=>{
    const shader=gl.createShader(type);
    if(!shader) throw Error('Shader unavailable');
    shaders.push(shader);gl.shaderSource(shader,source);gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) throw Error('Shader compilation failed');
    return shader;
  };
  const program=gl.createProgram();const buffer=gl.createBuffer();const texture=gl.createTexture();
  const dispose=()=>{if(texture)gl.deleteTexture(texture);if(buffer)gl.deleteBuffer(buffer);if(program)gl.deleteProgram(program);shaders.forEach(shader=>gl.deleteShader(shader));};
  try {
    if(!program||!buffer||!texture)throw Error('WebGL unavailable');
    gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Shader link failed');
    gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
    gl.uniform1i(gl.getUniformLocation(program,'contours'),0);
    const resolution=gl.getUniformLocation(program,'resolution'),rotation=gl.getUniformLocation(program,'angle'),ink=gl.getUniformLocation(program,'ink');
    return {
      draw(angle:number){
        if(gl.isContextLost())return false;
        const rect=canvas.getBoundingClientRect();
        const width=Math.min(512,Math.max(144,Math.round(rect.width*Math.min(window.devicePixelRatio||1,2))));
        const height=Math.round(width*60/96);
        if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
        gl.viewport(0,0,width,height);gl.useProgram(program);gl.uniform2f(resolution,width,height);gl.uniform1f(rotation,angle);
        const color=getComputedStyle(canvas).color.match(/[\d.]+/g)?.slice(0,3).map(Number)??[0,0,0];
        gl.uniform3f(ink,color[0]/255,color[1]/255,color[2]/255);gl.drawArrays(gl.TRIANGLES,0,6);return true;
      },dispose,
    };
  } catch {dispose();return null;}
}
