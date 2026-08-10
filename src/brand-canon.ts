export type BrandMarkId='aj-master'|'munin-seal'|'odin-symbol'|'document-seal';
export type BrandMark={id:BrandMarkId;name:string;purpose:string;assetRequired:boolean;allowedUses:string[];forbiddenUses:string[];locked:true};

export const BRAND_CANON={
  version:'AJ-BRAND-CANON-2.0',owner:'André Jardim',locked:true,
  doctrine:'Nordic influence belongs to the identity system, not to every illustration. Editorial content must look like executive innovation/financial-infrastructure publishing, never fantasy-Nordic decoration.',
  identity:{
    primaryMark:'aj-master' as BrandMarkId,
    rule:'The AJ master mark is immutable artwork. It MUST be composited from an approved asset after image generation. Never ask an image model to draw, spell, reinterpret, engrave or approximate it.',
    fallback:'If the approved AJ asset is unavailable, publish the visual with NO logo. Never create a placeholder AJ.',
    muninRule:'Munin uses only its approved raven seal asset. It is a product mark and is not the default personal LinkedIn signature.'
  },
  palette:{base:['near-black #080B10','charcoal #11161D','deep navy-black #07111F'],neutral:['off-white','cool gray','gunmetal','brushed silver'],primaryAccent:['restrained cold/electric blue'],exceptionAccent:['muted bronze/gold — maximum 10% of image and only when conceptually justified']},
  editorial:{format:'4:5 portrait',defaultText:'no text inside generated artwork',composition:'one dominant metaphor/object, strong negative space, magazine-grade composition, controlled cinematic light, restrained depth',tone:['premium editorial','executive','strategic','financial infrastructure','technology with restraint','minimal'],allowedFamilies:['architectural precision','abstract physical metaphor','machined object','glass/metal structure','subtle network/infrastructure geometry'],never:['career-consulting infographic style','white-background diagram as default','cyberpunk advertising','AI hologram cliché','fantasy Nordic scene','decorative runes','compass imagery','crypto coins','blockchain hexagon cliché','multiple unrelated icons','gold-dominant luxury aesthetic','HUD/interface graphics','generic business people']},
  marks:[
    {id:'aj-master',name:'AJ Master Mark',purpose:'personal executive signature',assetRequired:true,allowedUses:['small bottom-corner signature','profile/cover brand application','document signature'],forbiddenUses:['AI generation','redrawing','geometry changes','decorative centerpiece','rune improvisation'],locked:true},
    {id:'munin-seal',name:'Munin Raven Seal',purpose:'Munin product identity',assetRequired:true,allowedUses:['Munin product UI','Munin documentation','Munin-specific communication'],forbiddenUses:['default LinkedIn personal signature','AI-generated raven substitute','compass substitute'],locked:true},
    {id:'odin-symbol',name:'Odin Strategy Symbol',purpose:'optional strategy-system marker',assetRequired:true,allowedUses:['specific strategy artifacts only'],forbiddenUses:['default social watermark','decorative rune filler'],locked:true},
    {id:'document-seal',name:'Document Seal',purpose:'formal long-form identity',assetRequired:true,allowedUses:['white papers','formal reports','presentation covers'],forbiddenUses:['default social watermark'],locked:true}
  ] satisfies BrandMark[],
  social:{defaultMark:'aj-master' as BrandMarkId,placement:'bottom-right or bottom-left, subtle, fixed safe margin, never competing with hero object',logoMaxWidthPercent:7,logoOpacity:'70-90% depending on background',workflow:['generate clean editorial artwork with no logo','validate against editorial exclusions','composite exact approved AJ master asset','never regenerate logo as part of image']},
  legacyPolicy:'Previously published visuals are historical and must not be retroactively rewritten. Canon v2 applies to new work from 2026-08-10 onward.'
} as const;

export function editorialBrandPrompt(){return `AJ EDITORIAL SYSTEM v2 — LOCKED. Create ONLY the editorial artwork; DO NOT generate any logo, initials, monogram, rune, seal, signature or watermark. Visual language: ${BRAND_CANON.editorial.tone.join(', ')}. Palette: ${BRAND_CANON.palette.base.join(', ')} with ${BRAND_CANON.palette.primaryAccent.join(', ')}; gold/bronze is exceptional and may never dominate. Composition: ${BRAND_CANON.editorial.composition}. Avoid absolutely: ${BRAND_CANON.editorial.never.join(', ')}. The exact AJ master mark is applied later as a separate approved asset. If no asset is available, the final image remains unbranded.`;}

export function brandAssetRequirement(mark:BrandMarkId=BRAND_CANON.social.defaultMark){const selected=BRAND_CANON.marks.find(x=>x.id===mark)!;return {mark:selected.id,assetRequired:selected.assetRequired,rule:BRAND_CANON.identity.rule,fallback:BRAND_CANON.identity.fallback};}
