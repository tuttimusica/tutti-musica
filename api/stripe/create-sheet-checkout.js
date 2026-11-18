// Tutti sells protected PDFs only as part of Tutti Pro Vitalício.
// Keep this legacy endpoint explicitly disabled, including in preview.
// Existing file and bundle records are retained for audit/history.
export default async function handler(_req,res){
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  return res.status(410).json({error:'individual_pdf_sales_closed',message:'A biblioteca exclusiva faz parte do Tutti Pro Vitalício.'});
}
