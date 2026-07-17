# Curated Fish Image Generation

This document records the prompt set and local processing workflow used to create the 24 curated fish images in `public/fish_crops/` on 2026-07-17.

## Generation method

- Generator: Codex built-in image generation (`image_gen`), one independent generation call per species.
- Use case: `stylized-concept`.
- Generated source: square PNG on a flat green chroma-key background.
- Original output: 512×512 optimized RGBA PNG with a transparent background in `public/fish_crops/`.
- Webapp derivative: length-normalized copy in `public/fish_crops/normalized/`.
- Orientation: clean side profile, facing right.
- Naming: preserve the existing curated filenames listed below.

Image generation is nondeterministic. Reusing these prompts should reproduce the art direction and composition, but not identical pixels. For a visually consistent extension of the existing set, use a generated image from this collection as an explicit style reference when the generator supports reference images.

## Shared prompt template

Replace `{subject}` and `{traits}` with one entry from the species table. The 2026-07-17 set used `#00ff00` as `{key}` for every species.

```text
Use case: stylized-concept
Asset type: mobile aquarium species avatar
Primary request: Create one {subject}, recognizable and species-accurate, as a stylized semi-realistic 3D aquarium fish.
Subject details: {traits}
Scene/backdrop: perfectly flat solid {key} chroma-key background for local removal.
Style/medium: cute miniature polished mobile-game character; simplified rounded anatomy; smooth sculpted fins; bright saturated colors; soft premium 3D render; subtle self-shading and smooth gradients.
Composition/framing: exactly one complete fish in a clean side profile facing right; centered on a square canvas; generous even padding; entire fins and tail visible; crisp readable silhouette at 40 px.
Lighting/mood: gentle diffuse studio lighting on the fish only; soft dimensional highlights; no cast or contact shadow.
Constraints: background must be perfectly uniform with no gradient, texture, reflection, floor, scenery, bubbles, plants, rocks, or shadow. Do not use {key} anywhere in the fish. No text, labels, logo, frame, or watermark.
Avoid: photorealism, harsh outlines, flat vector styling, excessive scales or fin-ray detail, aggressive expression, multiple fish, cropped anatomy, three-quarter view, left-facing fish.
```

## Species substitutions

| Filename | `{subject}` | `{traits}` |
| --- | --- | --- |
| `angelfish.png` | freshwater angelfish (`Pterophyllum scalare`) | tall triangular silver body; three distinct vertical black bands; long smooth dorsal and anal fins; two elegant trailing pelvic filaments; compact rounded miniature proportions |
| `betta.png` | Siamese fighting fish / betta (`Betta splendens`) | saturated coral-red and royal-blue body; large flowing but smoothly sculpted fan-shaped fins and tail; rounded friendly head; luxurious silhouette without wispy transparent edges |
| `cardinal_tetra.png` | cardinal tetra (`Paracheirodon axelrodi`) | small streamlined body; vivid electric-blue horizontal stripe from eye to tail; saturated red lower stripe running nearly the full body; translucent-looking fins simplified into solid readable shapes |
| `cherry_barb.png` | male cherry barb (`Puntius titteya`) | small plump streamlined barb; rich cherry-red body with a subtle dark burgundy horizontal stripe; warm red fins; gently forked tail; friendly rounded head |
| `clown_loach.png` | clown loach (`Chromobotia macracanthus`) | rounded orange-gold body; exactly three bold black vertical bands including one through the eye; red-orange fins; downturned mouth with short subtle barbels; arched compact loach silhouette |
| `corydoras.png` | bronze corydoras catfish (`Corydoras aeneus`) | short armored bottom-dweller body; warm bronze-gold flanks with darker olive back; pale belly; small downturned mouth with two pairs of short barbels; tall triangular dorsal fin |
| `discus.png` | discus fish (`Symphysodon`) | nearly circular laterally compressed body; saturated turquoise-blue base with flowing coral-red maze-like bands; rounded dorsal and anal fins following the disc silhouette; small red eye |
| `dwarf_gourami.png` | male dwarf gourami (`Trichogaster lalius`) | compact oval body; alternating turquoise-blue and coral-red vertical bands; rounded dorsal and anal fins; two thin tactile pelvic feelers; bright friendly eye |
| `dwarf_rasbora.png` | dwarf rasbora (`Boraras maculatus`) | tiny slender coral-red fish; three distinct dark oval spots on the flank including a central spot and tail-base spot; translucent red-tinted fins; petite rounded profile |
| `german_blue_ram.png` | German blue ram cichlid (`Mikrogeophagus ramirezi`) | compact high-backed body; golden-yellow head and belly; electric-blue iridescent spots; bold black eye stripe and central black flank patch; orange-red fin accents |
| `goldfish.png` | fancy common goldfish (`Carassius auratus`) | rounded bright orange-gold body; glossy golden gradients; large flowing but simplified single fan tail; smooth dorsal and pectoral fins; cute friendly face without head growth |
| `guppy.png` | male guppy (`Poecilia reticulata`) | small turquoise-blue and golden body; oversized fan-shaped tail with saturated coral, blue, and yellow mosaic spots; colorful flowing dorsal fin; elegant compact silhouette |
| `harlequin_rasbora.png` | harlequin rasbora (`Trigonostigma heteromorpha`) | small copper-orange body; unmistakable black triangular wedge on rear half tapering toward tail; warm red-orange fins; streamlined rounded schooling-fish silhouette |
| `molly.png` | black molly (`Poecilia sphenops`) | compact velvety charcoal-black body with subtle blue-gray highlights; rounded belly; tall smooth dorsal fin; fan tail; simple friendly livebearer profile |
| `neon_tetra.png` | neon tetra (`Paracheirodon innesi`) | tiny streamlined body; brilliant electric-blue horizontal stripe from eye toward tail; vivid red stripe only on rear lower half; silver belly; simplified translucent fins |
| `oscar.png` | tiger oscar cichlid (`Astronotus ocellatus`) | chunky oval charcoal-black body; saturated irregular orange-red patches; distinct orange-ringed eyespot near tail base; strong rounded fins; friendly but robust cichlid head |
| `otocinclus.png` | otocinclus catfish (`Otocinclus affinis`) | small slender sucker-mouth catfish; warm silver-tan body; bold dark horizontal stripe from snout through eye to tail; mottled brown back; flat underside; small sucker mouth and compact fins |
| `platy.png` | sunset platy (`Xiphophorus maculatus`) | small rounded livebearer body; vivid orange-red body with golden-yellow face and belly gradient; compact fan tail; smooth rounded fins; cheerful friendly shape |
| `plecotmus.png` | common plecostomus catfish (`Hypostomus plecostomus`) | broad armored brown body covered in simplified golden-beige leopard spots; tall sail-like dorsal fin; flat belly; wide round sucker mouth; sturdy pectoral fins; long tapered tail |
| `rummy_nose_tetra.png` | rummy-nose tetra (`Hemigrammus rhodostomus`) | small translucent silver body; unmistakable vivid red head and snout; black-and-white horizontal bands across the forked tail; clear simplified fins; streamlined petite silhouette |
| `siamese_algae_eater.png` | Siamese algae eater (`Crossocheilus oblongus`) | slender silver-beige body; one bold ragged black horizontal stripe from snout through eye to tail tip; clear gray fins; slightly downturned mouth; streamlined torpedo silhouette |
| `swordtail.png` | male red swordtail (`Xiphophorus hellerii`) | bright orange-red streamlined livebearer; lower tail ray extended into one long elegant sword; golden belly highlights; compact dorsal fin; entire sword extension fully visible |
| `tiger_barb.png` | tiger barb (`Puntigrus tetrazona`) | compact golden-orange oval body; exactly four bold black vertical bands including eye and tail-base bands; vivid red-orange nose and fins; high-backed energetic silhouette |
| `zebra_danio.png` | zebra danio (`Danio rerio`) | small slender silver-blue body; five crisp dark navy horizontal stripes running from gill toward tail; golden-silver highlights; short rounded fins; streamlined schooling-fish silhouette |

## Transparency processing

The generated source should retain a completely uniform chroma background. Remove it with the installed image-generation helper:

```powershell
python "$HOME\.codex\skills\.system\imagegen\scripts\remove_chroma_key.py" `
  --input <generated-source.png> `
  --out <matte-output.png> `
  --auto-key border `
  --soft-matte `
  --transparent-threshold 12 `
  --opaque-threshold 220 `
  --despill `
  --force
```

The helper samples the actual border color, creates a soft alpha transition around antialiased fins, and removes green contamination from edge pixels.

## Resize and optimize

The 2026-07-17 outputs were converted to RGBA, resized to 512×512 with Pillow's Lanczos filter, and saved as optimized PNGs:

```python
from PIL import Image

image = Image.open("matte-output.png").convert("RGBA")
image = image.resize((512, 512), Image.Resampling.LANCZOS)
image.save(
    "public/fish_crops/species_name.png",
    format="PNG",
    optimize=True,
    compress_level=9,
)
```

Do not crop each fish tightly during resizing. The square canvas and original padding are intentional because the application displays these files with `object-fit: contain` at approximately 32–40 px.

## Non-destructive length normalization

Treat the 24 PNGs directly under `public/fish_crops/` as immutable source assets. The webapp uses derived copies under `public/fish_crops/normalized/`; never overwrite an original while adjusting display scale.

For each original:

1. Convert to RGBA and build a visibility mask from pixels whose alpha value is greater than `8`.
2. Crop to the mask's bounding box.
3. Resize proportionally to exactly `388` pixels wide with Pillow's Lanczos filter.
4. Clear residual alpha values at or below `8` after resampling.
5. Center the result horizontally and vertically on a transparent 512×512 canvas.
6. Save it to `public/fish_crops/normalized/<original-filename>.png` with PNG optimization and compression level 9.

```python
from PIL import Image

ALPHA_THRESHOLD = 8
TARGET_WIDTH = 388
CANVAS_SIZE = 512

source = Image.open("public/fish_crops/species_name.png").convert("RGBA")
mask = source.getchannel("A").point(
    lambda value: 255 if value > ALPHA_THRESHOLD else 0
)
bounds = mask.getbbox()
if bounds is None:
    raise ValueError("The source image has no visible pixels")

fish = source.crop(bounds)
target_height = round(fish.height * TARGET_WIDTH / fish.width)
fish = fish.resize((TARGET_WIDTH, target_height), Image.Resampling.LANCZOS)
fish.putalpha(
    fish.getchannel("A").point(
        lambda value: 0 if value <= ALPHA_THRESHOLD else value
    )
)

canvas = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
x = (CANVAS_SIZE - fish.width) // 2
y = (CANVAS_SIZE - fish.height) // 2
canvas.alpha_composite(fish, (x, y))
canvas.save(
    "public/fish_crops/normalized/species_name.png",
    format="PNG",
    optimize=True,
    compress_level=9,
)
```

Before and after normalization, compare SHA-256 hashes of every original file. A changed original hash is a failed run. Validate the derivatives with the same `alpha > 8` rule and require a visible bounding-box width of exactly 388 pixels.

## Acceptance checklist

For every regenerated asset, verify:

- It contains exactly one fish, shown completely in side profile and facing right.
- Species-defining silhouette, colors, stripes, spots, barbels, or tail extensions remain readable at 40 px.
- The file is a 512×512 RGBA PNG with fully transparent corner pixels.
- The alpha bounding box does not touch a canvas edge and retains visually even padding.
- The normalized derivative has an exact 388 px visible length when measured with `alpha > 8`.
- The original PNG remains byte-for-byte unchanged after derivative generation.
- There is no chroma-key fringe, background shadow, text, watermark, scenery, or second fish.
- Lighting, eye treatment, saturation, material softness, and anatomy simplification match the rest of the collection.

Regenerate only the outlier when a species fails these checks; do not alter the shared prompt for the already accepted images.
