export type EmailUrgency='normal'|'urgent';

const urgentPatterns=[
  /\b(today|hoje|eod|end of day|by close of business|cob)\b/i,
  /\b(within 24 hours?|next 24 hours?|em 24 horas?)\b/i,
  /\b(overdue|past due|vencido|vencida|atrasado|atrasada)\b/i,
  /\b(immediately|imediatamente|urgent|urgente)\b/i,
];

export function classifyEmailUrgency(input:{subject:string;snippet:string;actionReason?:string}):EmailUrgency{
  const text=`${input.subject}\n${input.snippet}\n${input.actionReason??''}`;
  return urgentPatterns.some(pattern=>pattern.test(text))?'urgent':'normal';
}
