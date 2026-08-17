import type { DocumentBenchmarkReport } from './document-benchmark.js';

export type DocumentPromotionVerdict='insufficient_evidence'|'promote'|'reject';
export type DocumentPromotionDecision={verdict:DocumentPromotionVerdict;documents:number;formats:number;doclingRate:number;failureRate:number;fallbackRate:number;reasons:string[]};

export function evaluateDocumentPromotion(report:DocumentBenchmarkReport):DocumentPromotionDecision{
 const formats=new Set(report.items.map(item=>item.extension).filter(Boolean)).size;
 const documents=report.documents;
 const doclingRate=documents?report.docling/documents:0;
 const failureRate=documents?report.failed/documents:0;
 const fallbackRate=documents?report.fallback/documents:0;
 const reasons:string[]=[];
 if(documents<5)reasons.push('need at least 5 real documents');
 if(formats<3)reasons.push('need at least 3 document formats');
 if(documents<5||formats<3)return{verdict:'insufficient_evidence',documents,formats,doclingRate,failureRate,fallbackRate,reasons};
 if(report.failed>0)reasons.push(`${report.failed} document(s) failed ingestion`);
 if(fallbackRate>.2)reasons.push(`fallback rate ${(fallbackRate*100).toFixed(1)}% exceeds 20%`);
 if(doclingRate<.8)reasons.push(`Docling rate ${(doclingRate*100).toFixed(1)}% is below 80%`);
 if(reasons.length)return{verdict:'reject',documents,formats,doclingRate,failureRate,fallbackRate,reasons};
 reasons.push('representative sample passed with no failures and at least 80% Docling coverage');
 return{verdict:'promote',documents,formats,doclingRate,failureRate,fallbackRate,reasons};
}
