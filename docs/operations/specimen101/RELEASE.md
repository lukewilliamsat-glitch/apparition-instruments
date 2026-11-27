# SPECIMEN VAULT 101 — SV-001 live

27 November 2026. Exact owner-supplied CTS `450GT36K504B2S` STEP replaces the procedural pots in PHANTASM. Immediate recovery: `87dd4762-fc91-42e8-8be3-be214f5f2104`.

## Asset and provenance

- STEP SHA-256 `aa1a5b8ef9754607b1c1ee4b84ae65f4aebc8ab1fe6368243e1df8fbb01cab72`, matching the target file in CTS’s public CAD archive. Owner explicitly confirmed permission covering publication of the derived web model. Supporting terms can be added when supplied; this is owner-attested permission, not an independently inspected general CTS redistribution licence. Original STEP, supplied datasheet, photos, packed Blender master, texture/height sources, preparation scripts, geometry and provenance records are retained in a private SV-001 package. Original CAD is absent from the public repository and website.
- CadQuery 2.7.0 / OpenCascade exact B-rep import; .018 mm linear / .075 rad angular tessellation, analytic face normals and sharp boundaries. Blender 4.3.2 UV/material preparation; gltfpack 1.3.0 meshopt compression, 16-bit positions / 12-bit normals, no simplification. All nine manufacturing bodies and 128,894 triangles retained. 10 geometry primitives shared by 40 mesh instances across the four pots; textures shared. Eight distinct material assignments.
- Web model: [SV-001 GLB](https://apparitioninstruments.co.uk/phantasm/assets/sv-001.glb), 1,376,956 bytes, SHA-256 `cab04fd424a536a59de1f809752fc5faebde865975e93d52a897eac9a300b1ac`. Source at `tests/specimen101/src/phantasm/assets/sv-001.glb`. Meshopt MIT attribution retained within PHANTASM. No PHANTASM dependencies added to the homepage.
- GLB units metres, origin at shaft axis / rear case plane; +Y shaft, +Z terminal bank; mounting datum Y11.303 mm. CAD can diameter23.622 mm, shaft diameter6.35 mm, 3/8-32 bushing major diameter9.525 mm. Above datum: bushing9.525 mm, shaft19.05 mm. Loaded compressed-model bounds accepted within .02 mm of CAD bounds. Measured tilted eyelet centres and directions replace the former procedural attachment assumptions.

## Material and visual acceptance

Tin casing, recessed identity, formed tinned terminals, plated mounting plate, neutral plated-looking shaft/bushing, amber/tan phenolic and dark internal insulator use separate PBR definitions. Illumination-free micro-normal, machining, roughness and resin-colour maps; verified part identity uses a recessed normal-map stamp. No EP086 or invented date/batch marking. No photographed hands, room, wood, shadows or reflections are projected into the model.

First rendered comparison exposed stretched side UVs and excess rear roughness variation; both corrected. Eight final rendered views inspected against the supplied photographs: rear case, terminal side, oblique housing, shaft side/full pot, thread/split/splines, wafer/mounting plate, top assembly and installed oblique assembly. The elevated close-up clearly shows the genuine physical split. Desktop/mobile milestones, forward/reverse poses, Signal Forge calculations including treble bleed options, pause, reduced motion, fallback and accessibility passed. Six-component modern harness/choreography retained, with no physical treble bleeds or MDF.

Known visual limits: idealised manufacturer CAD is not an optical scan; factory stamp font tooling and plating appearance are reconstructed/inferred from the photographs, not separately factory-certified. No claim of owner aesthetic acceptance.

## Production receipt

- Source `7f1971843ba47096457026980904d4c59cd64eac`; [acceptance 46023683924](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/46023683924); artifact `15211281438`.
- Static ZIP SHA-256 `29c12511df6e3068c0db5352db6275a8ca36a458b441fab38cefdc3bc16f9077`; manifest `183e8fd541445244def63c3dc2ea65f936c5b19118d0872f62820ea0e7145bba`.
- [Protected publication 46024687434](https://github.com/lukewilliamsat-glitch/apparition-instruments/actions/runs/46024687434) succeeded once with existing protected environments. Canonical Cloudflare deployment `fc59354c-0b8c-4baa-bfc2-bf04b0c331ee`, source independently verified.
- 521-file cumulative application. Only PHANTASM HTML/controller/scene changed; derived GLB and licence added. Every non-PHANTASM file remains identical to 100. QA views are excluded from the static ZIP.
- Ten independent public readbacks matched exact sealed bytes, including the GLB, PHANTASM runtime, homepage, checkout, basket and account. Protected publisher additionally checked shop and QUARTERMASTER route bytes. No backend, auth, payment, inventory, fulfilment or financial mutations. No artificial production transactions.
- Recovery `87dd4762-fc91-42e8-8be3-be214f5f2104` remains available. Existing LEGACY retained. Private master archive integrity verified before saving; no original CAD is publicly served.
