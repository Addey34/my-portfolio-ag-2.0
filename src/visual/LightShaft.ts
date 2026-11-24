import {
  AdditiveBlending,
  Color,
  ConeGeometry,
  DoubleSide,
  Mesh,
  ShaderMaterial,
} from 'three';

/** Hauteur locale du faisceau, dans le repère de la suspension. */
const SHAFT_HEIGHT = 9;

const vertexShader = /* glsl */ `
  varying vec3 vNormalView;
  varying vec3 vPositionView;
  varying float vDepth;
  void main() {
    vNormalView = normalize(normalMatrix * normal);
    vec4 view = modelViewMatrix * vec4(position, 1.0);
    vPositionView = view.xyz;
    vDepth = clamp(-position.y / ${SHAFT_HEIGHT.toFixed(1)}, 0.0, 1.0);
    gl_Position = projectionMatrix * view;
  }
`;

// Le bord du cône s'efface (angle de vue) et le faisceau s'éteint avec la distance :
// aucune arête visible, une seule passe additive sans texture.
const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  varying vec3 vNormalView;
  varying vec3 vPositionView;
  varying float vDepth;
  void main() {
    float facing = abs(dot(normalize(vNormalView), normalize(-vPositionView)));
    float edge = pow(facing, 2.2);
    float falloff = pow(1.0 - vDepth, 1.7) * smoothstep(0.0, 0.06, vDepth);
    float alpha = edge * falloff * 0.17 * uIntensity;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

export interface LightShaft {
  mesh: Mesh;
  /** 0 → éteint, 1 → puissance nominale de l'ampoule. */
  setIntensity(value: number): void;
  dispose(): void;
}

/**
 * Faisceau de la lampe : la lumière devient visible dans l'atelier.
 *
 * Un seul cône additif, sans ombre ni texture, porté par la suspension :
 * il suit la lampe et ne coûte qu'un appel de rendu.
 */
export function createLightShaft(): LightShaft {
  const geometry = new ConeGeometry(2.5, SHAFT_HEIGHT, 40, 1, true);
  // L'apex sert d'origine : le faisceau part de l'ampoule vers le bas.
  geometry.translate(0, -SHAFT_HEIGHT / 2, 0);
  const material = new ShaderMaterial({
    uniforms: {
      uColor: { value: new Color('#ffcf94') },
      uIntensity: { value: 1 },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    toneMapped: false,
  });
  const mesh = new Mesh(geometry, material);
  mesh.name = 'LAMP_LIGHT_SHAFT';
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  return {
    mesh,
    setIntensity: (value) => {
      material.uniforms.uIntensity.value = value;
    },
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
}
