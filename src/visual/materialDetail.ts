import {
  Vector3,
  Vector4,
  type IUniform,
  type MeshStandardMaterial,
  type WebGLProgramParametersWithUniforms,
} from 'three';

/**
 * Micro-détail de matière procédural, calculé dans le shader en espace objet.
 *
 * Les GLB des pièces maîtresses n'ont pas d'UV : des textures exigeraient un dépliage, des
 * images embarquées et de la mémoire GPU. Ici, aucune image : relief, rugosité et teinte
 * viennent d'un bruit de valeur évalué sur la position locale du sommet. Le détail s'efface
 * lorsque l'empreinte d'un pixel dépasse la taille du motif (pas de scintillement au loin).
 * Un seul programme sert toutes les matières ; le type et l'intensité sont des uniforms.
 */
export type DetailKind =
  | 'brushed'
  | 'brass'
  | 'polished'
  | 'enamel'
  | 'leather'
  | 'paper'
  | 'graphite';

interface DetailSpec {
  /** Identifiant numérique lu par le shader. */
  id: number;
  /** Amplitude du relief (dérivées d'écran). */
  bump: number;
  /** Variation de rugosité autour de la valeur du matériau. */
  rough: number;
  /** Variation de teinte (patine, marbrure) en multiplicatif. */
  tint: number;
  /** Fréquence de base du motif, en unités objet. */
  scale: number;
  /** Usure des arêtes : éclaircissement (x) et baisse de rugosité (y). */
  wear: [number, number];
}

export const DETAIL_SPECS: Record<DetailKind, DetailSpec> = {
  // Titane brossé : fines stries allongées dans le sens du tournage.
  brushed: {
    id: 1,
    bump: 1.1,
    rough: 0.2,
    tint: 0.22,
    scale: 70,
    wear: [0.35, 0.18],
  },
  // Laiton travaillé : stries + guillochis fins + patine irrégulière.
  brass: {
    id: 2,
    bump: 1.3,
    rough: 0.2,
    tint: 0.34,
    scale: 55,
    wear: [0.5, 0.14],
  },
  // Métal poli : seulement de rares rayures de rugosité.
  polished: {
    id: 3,
    bump: 0.2,
    rough: 0.1,
    tint: 0.08,
    scale: 90,
    wear: [0.18, 0.06],
  },
  // Émail : légère peau d'orange et variations de brillance.
  enamel: {
    id: 4,
    bump: 0.6,
    rough: 0.14,
    tint: 0.3,
    scale: 22,
    wear: [0.7, 0.12],
  },
  // Cuir : grain de galet et marbrure de teinte.
  leather: {
    id: 5,
    bump: 2.2,
    rough: 0.16,
    tint: 0.5,
    scale: 85,
    wear: [0.9, 0.2],
  },
  // Papier : fibres, tranche striée par feuillets.
  paper: {
    id: 6,
    bump: 1.0,
    rough: 0.1,
    tint: 0.14,
    scale: 120,
    wear: [0.15, 0.0],
  },
  // Graphite : grain sombre très fin.
  graphite: {
    id: 7,
    bump: 0.6,
    rough: 0.12,
    tint: 0.14,
    scale: 60,
    wear: [0.5, 0.15],
  },
};

/**
 * Choisit le détail d'une matière d'après son nom exporté (`PRÉFIXE / matière`).
 * Retourne null pour les matières émissives, vitrées ou sans identité matérielle.
 */
export function detailKindFor(name: string): DetailKind | null {
  const lower = name.toLowerCase();
  if (
    /glass|sun|rune|energy|seal glow|pupil|cyan index|mauve index/.test(lower)
  )
    return null;
  if (/leather|strap|obsidian/.test(lower) && lower.startsWith('book'))
    return 'leather';
  if (/oiled leather|oiled strap/.test(lower)) return 'leather';
  if (/paper|ivory/.test(lower)) return 'paper';
  if (/enamel/.test(lower)) return 'enamel';
  if (/polished|rhodium/.test(lower)) return 'polished';
  if (/brass|champagne|gilt|gold/.test(lower)) return 'brass';
  if (/titanium|steel/.test(lower)) return 'brushed';
  if (/graphite|obsidian/.test(lower)) return 'graphite';
  return null;
}

const CACHE_KEY = 'material-detail-v1';

const VERTEX_PARS = /* glsl */ `
varying vec3 vDetailPos;
varying vec3 vDetailNormal;
`;

const FRAGMENT_PARS = /* glsl */ `
varying vec3 vDetailPos;
varying vec3 vDetailNormal;
uniform float uDetailKind;
uniform vec4 uDetailAmp;
uniform vec4 uDetailGild;
uniform vec3 uDetailWear;

float detailHash(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}
float detailNoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(detailHash(i), detailHash(i + vec3(1, 0, 0)), f.x),
        mix(detailHash(i + vec3(0, 1, 0)), detailHash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(detailHash(i + vec3(0, 0, 1)), detailHash(i + vec3(1, 0, 1)), f.x),
        mix(detailHash(i + vec3(0, 1, 1)), detailHash(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}
// Atténuation selon l'empreinte du pixel : un motif de période w s'efface quand il devient sous-pixel.
float detailFade(float footprint, float period) {
  return 1.0 - smoothstep(0.3 * period, 0.9 * period, footprint);
}
vec3 detailPerturb(vec3 surfPos, vec3 surfNorm, vec2 dHdxy, float faceDirection) {
  vec3 sx = normalize(dFdx(surfPos));
  vec3 sy = normalize(dFdy(surfPos));
  vec3 r1 = cross(sy, surfNorm);
  vec3 r2 = cross(surfNorm, sx);
  float det = dot(sx, r1) * faceDirection;
  vec3 grad = sign(det) * (dHdxy.x * r1 + dHdxy.y * r2);
  return normalize(abs(det) * surfNorm - grad);
}
// Hauteur (x), variation de rugosité (y), variation de teinte (z).
vec3 detailSample(vec3 p, vec3 n, float kind, float scale, float footprint) {
  float h = 0.0;
  float r = 0.0;
  // Macro-échelle (≈ 20 à 40 px à l'écran) : patine, marbrure, bandes de brossage.
  float t = detailNoise(p * scale * 0.09);
  float micro = uDetailWear.z;
  // Mode léger (petits écrans) : le grain est sous-pixel, seuls la macro-échelle et l'usure restent.
  float f = micro * detailFade(footprint, 1.0 / scale);
  // Motif sous-pixel (ou mode léger) : on garde macro-échelle et usure, sans évaluer les bruits fins.
  // Le papier garde son calcul : la striation des tranches a une période plus grande.
  if (f < 0.03 && kind < 5.5 || kind > 6.5 && f < 0.03 || micro < 0.5)
    return vec3(0.0, (t - 0.5) * 0.6, t - 0.5);
  if (kind < 1.5) {
    // Brossé : bruit étiré le long de X, stries fines.
    float s = detailNoise(vec3(p.x * scale * 0.08, p.y * scale, p.z * scale));
    h = (s - 0.5) * f;
    r = (s - 0.5) * f + (t - 0.5) * 0.8;
  } else if (kind < 2.5) {
    // Laiton : stries + guillochis radiaux fins.
    float s = detailNoise(vec3(p.x * scale * 0.1, p.y * scale, p.z * scale));
    float rad = length(p.xy);
    float guil = 0.5 + 0.5 * sin(rad * scale * 3.2 + t * 6.0);
    h = ((s - 0.5) * 0.7 + (guil - 0.5) * 0.45) * f;
    r = (s - 0.5) * f;
  } else if (kind < 3.5) {
    // Poli : rayures rares seulement dans la rugosité.
    float s = detailNoise(vec3(p.x * scale * 0.04, p.y * scale, p.z * scale * 0.5));
    r = (smoothstep(0.78, 0.95, s) - 0.1) * f;
    h = 0.0;
  } else if (kind < 4.5) {
    // Émail : peau d'orange douce.
    float s = detailNoise(p * scale);
    h = (s - 0.5) * f;
    r = t - 0.5;
  } else if (kind < 5.5) {
    // Cuir : grain de galet (crêtes d'un bruit).
    float a = detailNoise(p * scale);
    float pebble = 1.0 - abs(a * 2.0 - 1.0);
    h = (pebble - 0.5) * f;
    r = (a - 0.5) * f;
  } else if (kind < 6.5) {
    // Papier : fibres ; sur les tranches, striation par feuillets le long de Z.
    float fibre = detailNoise(vec3(p.x * scale, p.y * scale * 0.2, p.z * scale)) - 0.5;
    float side = 1.0 - smoothstep(0.35, 0.75, abs(n.z));
    float leaves = 0.5 + 0.5 * sin(p.z * 520.0);
    float fl = micro * detailFade(footprint, 0.012);
    h = fibre * f * (1.0 - side) + (leaves - 0.5) * fl * side;
    r = fibre * f;
    t = mix(t, leaves, side * 0.6);
  } else {
    // Graphite : grain fin.
    h = (detailNoise(p * scale) - 0.5) * f;
    r = (t - 0.5) * 0.6;
  }
  return vec3(h, r, t - 0.5);
}
`;

const VERTEX_BEGIN = /* glsl */ `
#include <begin_vertex>
vDetailPos = position;
vDetailNormal = normal;
`;

const FRAGMENT_COLOR = /* glsl */ `
#include <color_fragment>
vec3 detailFp = fwidth(vDetailPos);
float detailFootprint = max(detailFp.x, max(detailFp.y, detailFp.z));
vec3 detailS = vec3(0.0);
if (uDetailKind > 0.5) {
  detailS = detailSample(vDetailPos, normalize(vDetailNormal), uDetailKind, uDetailAmp.w, detailFootprint);
  diffuseColor.rgb *= 1.0 + detailS.z * uDetailAmp.z * 2.0;
  if (uDetailGild.w > 0.0) {
    // Tranche dorée : le papier prend la teinte de la dorure sur ses côtés.
    float edge = 1.0 - smoothstep(0.35, 0.75, abs(normalize(vDetailNormal).z));
    diffuseColor.rgb = mix(diffuseColor.rgb, uDetailGild.rgb, edge * uDetailGild.w);
  }
}
`;

const FRAGMENT_ROUGHNESS = /* glsl */ `
#include <roughnessmap_fragment>
roughnessFactor = clamp(roughnessFactor + detailS.y * uDetailAmp.y * 2.0, 0.04, 1.0);
`;

const FRAGMENT_NORMAL = /* glsl */ `
#include <normal_fragment_maps>
if (uDetailKind > 0.5) {
  // Arêtes : la dérivée écran de la normale repère les chanfreins, polis par l'usage.
  float detailEdge = smoothstep(0.05, 0.28, length(fwidth(normal)));
  roughnessFactor = clamp(roughnessFactor - detailEdge * uDetailWear.y, 0.04, 1.0);
  diffuseColor.rgb *= 1.0 + detailEdge * uDetailWear.x;
}
if (uDetailKind > 0.5 && uDetailAmp.x > 0.0) {
  vec2 dH = vec2(dFdx(detailS.x), dFdy(detailS.x)) * uDetailAmp.x;
  normal = detailPerturb(-vViewPosition, normal, dH, faceDirection);
}
`;

/**
 * Branche le micro-détail sur un matériau standard. Idempotent : un second appel remplace
 * simplement le type. `intensity` module relief, rugosité et teinte (1 = réglage nominal).
 */
export function applyMaterialDetail(
  material: MeshStandardMaterial,
  kind: DetailKind,
  intensity = 1,
  goldEdge?: { color: [number, number, number]; mix: number },
  micro = true
): void {
  const spec = DETAIL_SPECS[kind];
  const uniforms: Record<string, IUniform> = {
    uDetailKind: { value: spec.id },
    uDetailAmp: {
      value: new Vector4(
        spec.bump * intensity,
        spec.rough * intensity,
        spec.tint * intensity,
        spec.scale
      ),
    },
    uDetailWear: {
      value: new Vector3(
        spec.wear[0] * intensity,
        spec.wear[1] * intensity,
        micro ? 1 : 0
      ),
    },
    uDetailGild: {
      value: goldEdge
        ? new Vector4(...goldEdge.color, goldEdge.mix)
        : new Vector4(0, 0, 0, 0),
    },
  };
  material.userData.materialDetail = kind;
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${VERTEX_PARS}`)
      .replace('#include <begin_vertex>', VERTEX_BEGIN);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${FRAGMENT_PARS}`)
      .replace('#include <color_fragment>', FRAGMENT_COLOR)
      .replace('#include <roughnessmap_fragment>', FRAGMENT_ROUGHNESS)
      .replace('#include <normal_fragment_maps>', FRAGMENT_NORMAL);
  };
  material.customProgramCacheKey = () => CACHE_KEY;
  material.needsUpdate = true;
}
