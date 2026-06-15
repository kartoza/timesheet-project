import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export async function exportDashboardToPDF(container: HTMLElement, filename = 'pmo-dashboard.pdf'): Promise<void> {
  const pages = Array.from(container.querySelectorAll<HTMLElement>('[data-print-page]'));

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });

  for (let i = 0; i < pages.length; i++) {
    if (i > 0) pdf.addPage('a4');
    const canvas = await html2canvas(pages[i], {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pw, ph);
  }

  pdf.save(filename);
}
