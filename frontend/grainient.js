const hexToRgb = hex => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [1, 1, 1];
  return [parseInt(result[1], 16) / 255, parseInt(result[2], 16) / 255, parseInt(result[3], 16) / 255];
};

const vertex = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragment = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform float uTimeSpeed;
uniform float uColorBalance;
uniform float uWarpStrength;
uniform float uWarpFrequency;
uniform float uWarpSpeed;
uniform float uWarpAmplitude;
uniform float uBlendAngle;
uniform float uBlendSoftness;
uniform float uRotationAmount;
uniform float uNoiseScale;
uniform float uGrainAmount;
uniform float uGrainScale;
uniform float uGrainAnimated;
uniform float uContrast;
uniform float uGamma;
uniform float uSaturation;
uniform vec2 uCenterOffset;
uniform float uZoom;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
out vec4 fragColor;
#define S(a,b,t) smoothstep(a,b,t)
mat2 Rot(float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c);} 
vec2 hash(vec2 p){p=vec2(dot(p,vec2(2127.1,81.17)),dot(p,vec2(1269.5,283.37)));return fract(sin(p)*43758.5453);} 
float noise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f);float n=mix(mix(dot(-1.0+2.0*hash(i+vec2(0.0,0.0)),f-vec2(0.0,0.0)),dot(-1.0+2.0*hash(i+vec2(1.0,0.0)),f-vec2(1.0,0.0)),u.x),mix(dot(-1.0+2.0*hash(i+vec2(0.0,1.0)),f-vec2(0.0,1.0)),dot(-1.0+2.0*hash(i+vec2(1.0,1.0)),f-vec2(1.0,1.0)),u.x),u.y);return 0.5+0.5*n;}
void mainImage(out vec4 o, vec2 C){
  float t=iTime*uTimeSpeed;
  vec2 uv=C/iResolution.xy;
  float ratio=iResolution.x/iResolution.y;
  vec2 tuv=uv-0.5+uCenterOffset;
  tuv/=max(uZoom,0.001);

  float degree=noise(vec2(t*0.1,tuv.x*tuv.y)*uNoiseScale);
  tuv.y*=1.0/ratio;
  tuv*=Rot(radians((degree-0.5)*uRotationAmount+180.0));
  tuv.y*=ratio;

  float frequency=uWarpFrequency;
  float ws=max(uWarpStrength,0.001);
  float amplitude=uWarpAmplitude/ws;
  float warpTime=t*uWarpSpeed;
  tuv.x+=sin(tuv.y*frequency+warpTime)/amplitude;
  tuv.y+=sin(tuv.x*(frequency*1.5)+warpTime)/(amplitude*0.5);

  vec3 colLav=uColor1;
  vec3 colOrg=uColor2;
  vec3 colDark=uColor3;
  float b=uColorBalance;
  float s=max(uBlendSoftness,0.0);
  mat2 blendRot=Rot(radians(uBlendAngle));
  float blendX=(tuv*blendRot).x;
  float edge0=-0.3-b-s;
  float edge1=0.2-b+s;
  float v0=0.5-b+s;
  float v1=-0.3-b-s;
  vec3 layer1=mix(colDark,colOrg,S(edge0,edge1,blendX));
  vec3 layer2=mix(colOrg,colLav,S(edge0,edge1,blendX));
  vec3 col=mix(layer1,layer2,S(v0,v1,tuv.y));

  vec2 grainUv=uv*max(uGrainScale,0.001);
  if(uGrainAnimated>0.5){grainUv+=vec2(iTime*0.05);} 
  float grain=fract(sin(dot(grainUv,vec2(12.9898,78.233)))*43758.5453);
  col+=(grain-0.5)*uGrainAmount;

  col=(col-0.5)*uContrast+0.5;
  float luma=dot(col,vec3(0.2126,0.7152,0.0722));
  col=mix(vec3(luma),col,uSaturation);
  col=pow(max(col,0.0),vec3(1.0/max(uGamma,0.001)));
  col=clamp(col,0.0,1.0);

  o=vec4(col,1.0);
}
void main(){
  vec4 o=vec4(0.0);
  mainImage(o,gl_FragCoord.xy);
  fragColor=o;
}
`;

window.Grainient = class Grainient {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      timeSpeed: 0.25,
      colorBalance: 0.0,
      warpStrength: 1.0,
      warpFrequency: 5.0,
      warpSpeed: 2.0,
      warpAmplitude: 50.0,
      blendAngle: 0.0,
      blendSoftness: 0.05,
      rotationAmount: 500.0,
      noiseScale: 2.0,
      grainAmount: 0.1,
      grainScale: 2.0,
      grainAnimated: false,
      contrast: 1.5,
      gamma: 1.0,
      saturation: 1.0,
      centerX: 0.0,
      centerY: 0.0,
      zoom: 0.9,
      color1: '#FF9FFC',
      color2: '#5227FF',
      color3: '#B497CF',
      ...options
    };

    this.renderer = null;
    this.gl = null;
    this.canvas = null;
    this.geometry = null;
    this.program = null;
    this.mesh = null;
    this.ro = null;
    this.raf = 0;
    this.t0 = performance.now();

    this.init();
  }

  async init() {
    try {
      const { Renderer, Program, Mesh, Triangle } = await import('/frontend/ogl.js');
      
      this.renderer = new Renderer({
        webgl: 2,
        alpha: true,
        antialias: false,
        dpr: 1.0
      });

      this.gl = this.renderer.gl;
      this.canvas = this.gl.canvas;
      this.canvas.style.width = '100%';
      this.canvas.style.height = '100%';
      this.canvas.style.display = 'block';
      this.container.appendChild(this.canvas);

      this.geometry = new Triangle(this.gl);
      this.program = new Program(this.gl, {
        vertex,
        fragment,
        uniforms: {
          iTime:           { value: 0 },
          iResolution:     { value: new Float32Array([1, 1]) },
          uTimeSpeed:      { value: this.options.timeSpeed },
          uColorBalance:   { value: this.options.colorBalance },
          uWarpStrength:   { value: this.options.warpStrength },
          uWarpFrequency:  { value: this.options.warpFrequency },
          uWarpSpeed:      { value: this.options.warpSpeed },
          uWarpAmplitude:  { value: this.options.warpAmplitude },
          uBlendAngle:     { value: this.options.blendAngle },
          uBlendSoftness:  { value: this.options.blendSoftness },
          uRotationAmount: { value: this.options.rotationAmount },
          uNoiseScale:     { value: this.options.noiseScale },
          uGrainAmount:    { value: this.options.grainAmount },
          uGrainScale:     { value: this.options.grainScale },
          uGrainAnimated:  { value: this.options.grainAnimated ? 1.0 : 0.0 },
          uContrast:       { value: this.options.contrast },
          uGamma:          { value: this.options.gamma },
          uSaturation:     { value: this.options.saturation },
          uCenterOffset:   { value: new Float32Array([this.options.centerX, this.options.centerY]) },
          uZoom:           { value: this.options.zoom },
          uColor1:         { value: new Float32Array(hexToRgb(this.options.color1)) },
          uColor2:         { value: new Float32Array(hexToRgb(this.options.color2)) },
          uColor3:         { value: new Float32Array(hexToRgb(this.options.color3)) }
        }
      });

      this.mesh = new Mesh(this.gl, { geometry: this.geometry, program: this.program });
      
      this.ro = new ResizeObserver(() => this.setSize());
      this.ro.observe(this.container);
      this.setSize();

      this.loop = (t) => {
        if (this.program) {
          this.program.uniforms.iTime.value = (t - this.t0) * 0.001;
          this.renderer.render({ scene: this.mesh });
          this.raf = requestAnimationFrame(this.loop);
        }
      };

      this.start();
    } catch (e) {
      console.error("OGL dynamic import failed:", e);
    }
  }

  setSize() {
    if (!this.renderer || !this.program) return;
    const rect = this.container.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    this.renderer.setSize(w, h);
    const res = this.program.uniforms.iResolution.value;
    res[0] = this.gl.drawingBufferWidth;
    res[1] = this.gl.drawingBufferHeight;
    if (this.renderer && this.mesh) {
      this.renderer.render({ scene: this.mesh });
    }
  }

  updateUniforms(newOptions = {}) {
    this.options = { ...this.options, ...newOptions };
    if (!this.program) return;
    const u = this.program.uniforms;
    u.uTimeSpeed.value      = this.options.timeSpeed;
    u.uColorBalance.value   = this.options.colorBalance;
    u.uWarpStrength.value   = this.options.warpStrength;
    u.uWarpFrequency.value  = this.options.warpFrequency;
    u.uWarpSpeed.value      = this.options.warpSpeed;
    u.uWarpAmplitude.value  = this.options.warpAmplitude;
    u.uBlendAngle.value     = this.options.blendAngle;
    u.uBlendSoftness.value  = this.options.blendSoftness;
    u.uRotationAmount.value = this.options.rotationAmount;
    u.uNoiseScale.value     = this.options.noiseScale;
    u.uGrainAmount.value    = this.options.grainAmount;
    u.uGrainScale.value     = this.options.grainScale;
    u.uGrainAnimated.value  = this.options.grainAnimated ? 1.0 : 0.0;
    u.uContrast.value       = this.options.contrast;
    u.uGamma.value          = this.options.gamma;
    u.uSaturation.value     = this.options.saturation;
    u.uCenterOffset.value   = new Float32Array([this.options.centerX, this.options.centerY]);
    u.uZoom.value           = this.options.zoom;
    u.uColor1.value         = new Float32Array(hexToRgb(this.options.color1));
    u.uColor2.value         = new Float32Array(hexToRgb(this.options.color2));
    u.uColor3.value         = new Float32Array(hexToRgb(this.options.color3));
  }

  start() {
    if (this.raf === 0 && this.loop) {
      this.raf = requestAnimationFrame(this.loop);
    }
  }

  stop() {
    if (this.raf !== 0) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
  }

  destroy() {
    this.stop();
    if (this.ro) this.ro.disconnect();
    try {
      if (this.canvas && this.container) this.container.removeChild(this.canvas);
    } catch (e) {}
  }
}
