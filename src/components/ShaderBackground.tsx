"use client";

import { useEffect, useRef } from "react";

const vertexShaderSource = `
attribute vec2 a_position;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const fragmentShaderSource = `
precision mediump float;

uniform vec2 u_resolution;
uniform float u_time;

float cosRange(float amt, float range, float minimum) {
  return (((1.0 + cos(radians(amt))) * 0.5) * range) + minimum;
}

void main() {
  const int zoom = 40;
  const float brightness = .99;
  float time = u_time * 0.85;
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec2 p = (2.0 * gl_FragCoord.xy - u_resolution.xy) / max(u_resolution.x, u_resolution.y);
  float ct = cosRange(time * 5.0, 3.0, 1.1);
  float xBoost = cosRange(time * 0.2, 5.0, 5.0);
  float yBoost = cosRange(time * 0.1, 10.0, 5.0);
  float fScale = cosRange(time * 15.5, 1.25, 0.5);

  for (int i = 1; i < zoom; i++) {
    float fi = float(i);
    vec2 newp = p;
    newp.x += 0.25 / fi * sin(fi * p.y + time * cos(ct) * 0.5 / 20.0 + 0.005 * fi) * fScale + xBoost;
    newp.y += 0.25 / fi * sin(fi * p.x + time * ct * 0.3 / 40.0 + 0.03 * float(i + 15)) * fScale + yBoost;
    p = newp;
  }

  vec3 base = vec3(
    0.5 * sin(3.0 * p.x) + 0.5,
    0.5 * sin(3.0 * p.y) + 0.5,
    0.5 * sin(p.x + p.y) + 0.5
  );

  vec3 cocoa = vec3(107.0 / 255.0, 62.0 / 255.0, 38.0 / 255.0);
  vec3 blush = vec3(1.0, 197.0 / 255.0, 217.0 / 255.0);
  vec3 mint = vec3(194.0 / 255.0, 242.0 / 255.0, 208.0 / 255.0);
  vec3 cream = vec3(253.0 / 255.0, 245.0 / 255.0, 201.0 / 255.0);

  float creamMask = smoothstep(0.72, 0.14, base.x);
  float blushMask = smoothstep(0.28, 0.82, base.x);
  float cocoaMask = smoothstep(0.56, 0.94, base.z) * (0.72 + 0.28 * (1.0 - base.x));
  float mintMask = smoothstep(0.82, 0.98, base.y) * 0.35;

  vec4 weights = vec4(
    0.35 * (0.45 + creamMask),
    0.35 * (0.45 + blushMask),
    0.20 * (0.4 + cocoaMask),
    0.10 * (0.2 + mintMask)
  );
  weights = pow(weights, vec4(1.8));
  weights /= dot(weights, vec4(1.0));

  vec3 col =
    cream * weights.x +
    blush * weights.y +
    cocoa * weights.z +
    mint * weights.w;
  col *= brightness;

  float vigAmt = 5.0;
  float vignette = (1.0 - vigAmt * (uv.y - 0.5) * (uv.y - 0.5)) * (1.0 - vigAmt * (uv.x - 0.5) * (uv.x - 0.5));
  vignette = clamp(vignette, 0.0, 1.0);
  col = mix(col * .99 + cocoa * 0.05, col, vignette);

  gl_FragColor = vec4(col, 1.0);
}
`;

function createShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);

  if (!shader) {
    return null;
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    return shader;
  }

  gl.deleteShader(shader);
  return null;
}

function createProgram(gl: WebGLRenderingContext, vertexSource: string, fragmentSource: string) {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

  if (!vertexShader || !fragmentShader) {
    if (vertexShader) gl.deleteShader(vertexShader);
    if (fragmentShader) gl.deleteShader(fragmentShader);
    return null;
  }

  const program = gl.createProgram();

  if (!program) {
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    return null;
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
    return program;
  }

  gl.deleteProgram(program);
  return null;
}

export function ShaderBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const gl = canvas.getContext("webgl", { alpha: true, antialias: true });

    if (!gl) {
      return;
    }

    const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);

    if (!program) {
      return;
    }

    const positionLocation = gl.getAttribLocation(program, "a_position");
    const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
    const timeLocation = gl.getUniformLocation(program, "u_time");
    const buffer = gl.createBuffer();

    if (!buffer || !resolutionLocation || !timeLocation || positionLocation < 0) {
      if (buffer) gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      return;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );

    let animationFrameId = 0;
    let startTime = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.floor(window.innerWidth * dpr);
      const height = Math.floor(window.innerHeight * dpr);

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      canvas.style.width = "100vw";
      canvas.style.height = "100vh";
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const render = (now: number) => {
      resize();
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      gl.uniform1f(timeLocation, (now - startTime) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationFrameId = window.requestAnimationFrame(render);
    };

    resize();
    animationFrameId = window.requestAnimationFrame(render);
    window.addEventListener("resize", resize);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resize);
      gl.disableVertexAttribArray(positionLocation);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      gl.deleteBuffer(buffer);
      gl.useProgram(null);
      gl.deleteProgram(program);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="shader-background" />;
}