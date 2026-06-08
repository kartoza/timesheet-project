import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export async function exportDashboardToPDF(element: HTMLElement, filename = 'pmo-dashboard.pdf'): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  });

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [794, 1123] });
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pw, ph);
  pdf.save(filename);
}
