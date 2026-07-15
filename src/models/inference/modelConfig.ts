export const MODEL_PATHS = {
  detection: '/models/fish_detection.onnx',
  species: '/models/species_classifier.onnx',
  turbidity: '/models/turbidity.onnx',
} as const;

export const MODEL_VERSION = '2026-07-15-v1';

export const DETECTION_INPUT_SIZE = 576;
export const SPECIES_INPUT_SIZE = 224;
export const SPECIES_RESIZE_SIZE = Math.trunc(SPECIES_INPUT_SIZE * 1.14);
export const TURBIDITY_INPUT_SIZE = 224;

export const IMAGE_NET_MEAN = [0.485, 0.456, 0.406] as const;
export const IMAGE_NET_STD = [0.229, 0.224, 0.225] as const;

export const SPECIES_CONFIDENCE_THRESHOLD = 0.3;

export const SPECIES_CLASSES = [
  'angelfish',
  'betta',
  'black_skirt_tetra',
  'cardinal_tetra',
  'cherry_barb',
  'clown_loach',
  'corydoras',
  'discus',
  'dwarf_gourami',
  'german_blue_ram',
  'goldfish',
  'guppy',
  'harlequin_rasbora',
  'molly',
  'neon_tetra',
  'oscar',
  'otocinclus',
  'platy',
  'plecostomus',
  'rummy_nose_tetra',
  'siamese_algae_eater',
  'swordtail',
  'tiger_barb',
  'zebra_danio',
] as const;

export const TURBIDITY_CLASSES = [
  '00-0.49',
  '00.5-0.99',
  '01-2.49',
  '02.5-4.99',
  '05-9.99',
  '10-14.99',
  '15-20.99',
  '21-28.99',
  '29-36.99',
  '37-44.99',
  '45-55',
] as const;

export const TURBIDITY_COEFFICIENTS = [
  61.34,
  61.57,
  62.48,
  65.53,
  67.76,
  73.91,
  77.63,
  85.64,
  94,
  102.85,
  114.32,
] as const;

export const TURBIDITY_CONSTANT = -60.9;
