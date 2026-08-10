export type BrandMarkId='aj-rune'|'munin-seal'|'odin-symbol'|'executive-monogram'|'document-seal';
export type BrandMark={id:BrandMarkId;name:string;purpose:string;description:string;allowedUses:string[];forbiddenUses:string[];locked:true};

export const BRAND_CANON={
  version:'AJ-RUNE-2026.08',
  owner:'André Jardim',
  source:'AJ Rune Brand Identity Board — canonical brand package',
  locked:true,
  palette:{background:['near-black','charcoal','deep navy-black'],metal:['brushed silver','gunmetal','stone-metal'],accent:['restrained electric blue'],secondary:['muted bronze only when editorially justified']},
  principles:['minimalist','Nordic-inspired','executive','technological','symbolic','premium editorial','single dominant symbolic object','high negative space','controlled cinematic lighting'],
  typography:'clean, elegant, spaced uppercase sans-serif; restrained hierarchy; never decorative sci-fi typography',
  marks:[
    {id:'aj-rune',name:'AJ Rune — Marca Principal',purpose:'primary personal identity',description:'Runic/angled AJ monogram inside a broken circular frame, lateral runic marks, branch/rune above and raven detail below.',allowedUses:['hero brand applications','profile/cover applications','signature brand boards','select premium LinkedIn visuals'],forbiddenUses:['redrawing with generic AJ typography','replacing broken circle with compass','adding unrelated icons','changing rune geometry'],locked:true},
    {id:'munin-seal',name:'Selo Munin',purpose:'Munin identity',description:'Geometric raven/crow head seal representing memory, knowledge and consciousness.',allowedUses:['Munin product surfaces','Munin-related editorial materials','small supporting seal'],forbiddenUses:['generic compass rose','eagle/bird substitutions','random raven styles','using as personal AJ replacement'],locked:true},
    {id:'odin-symbol',name:'Símbolo Odin',purpose:'vision, strategy and transformation',description:'Vertical spear/arrow-like emblem with Nordic knot/runic geometry and partial circular frame.',allowedUses:['strategy/vision artifacts','select section markers'],forbiddenUses:['using as default LinkedIn logo','mixing with unrelated compass symbols'],locked:true},
    {id:'executive-monogram',name:'Marca Executiva — Monograma AJ',purpose:'compact executive signature',description:'Simplified canonical AJ rune monogram without surrounding ornaments.',allowedUses:['subtle emboss/engraving','small signature on LinkedIn visuals','profile/avatar when full crest is too detailed'],forbiddenUses:['generic serif AJ','generic sans AJ','new AI-generated AJ geometry'],locked:true},
    {id:'document-seal',name:'Selo de Documentos',purpose:'articles, white papers and presentations',description:'Circular formal seal with André Jardim identity, AJ rune and canonical supporting rune details.',allowedUses:['white papers','articles','presentations','formal document covers'],forbiddenUses:['default social post watermark','simplified invented badges'],locked:true}
  ] satisfies BrandMark[],
  elementMeaning:{'mountain-spear':'Direção, superação e ambição com propósito.','branch-rune':'Crescimento, visão e evolução contínua.','raven-munin':'Memória, conhecimento e consciência.','runic-marks':'Proteção, equilíbrio e conexão com o essencial.','incomplete-circle':'Jornada contínua; sempre em construção.','central-diamond':'Foco, clareza e intenção.'},
  social:{format:'4:5 portrait / 1200x1500 reference',defaultMark:'executive-monogram' as BrandMarkId,brandPlacement:'small and secondary; integrated/engraved when possible, never competing with the editorial object',noTextByDefault:true},
  forbidden:['inventing a new AJ logo','using a compass rose as Munin','generic bird/eagle logo','multiple brand marks in the same social visual unless explicitly requested','logo as oversized decorative centerpiece','cyberpunk neon treatment','uncontrolled gold crypto aesthetic','random runes unrelated to the canon']
} as const;

export function canonicalBrandPrompt(mark:BrandMarkId=BRAND_CANON.social.defaultMark){const selected=BRAND_CANON.marks.find(x=>x.id===mark)??BRAND_CANON.marks[3];return `BRAND CANON — LOCKED. Use only the canonical ${selected.name}: ${selected.description} Do not redesign, reinterpret or substitute the logo. If the exact canonical asset is unavailable to the image model, leave a clean reserved brand area or use only a subtle engraved placeholder reading “AJ” rather than inventing geometry. Munin must use the canonical geometric raven seal, never a compass. Brand treatment: ${BRAND_CANON.social.brandPlacement}. Palette: ${BRAND_CANON.palette.background.join(', ')}, ${BRAND_CANON.palette.metal.join(', ')}, restrained blue accent. Forbidden: ${BRAND_CANON.forbidden.join(', ')}.`;}
