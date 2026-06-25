import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { Parser } from 'json2csv';
// pdfkit is a commonjs module and might require special import handling or types
// For simplicity and stability, we will use a basic HTML/PDF generator if needed,
// but for this implementation we will rely on exceljs and json2csv. 
// A real PDF generation could be done using Puppeteer or pdfkit.
import PDFDocument from 'pdfkit';

@Injectable()
export class ExportService {
  
  exportCsv(data: any[]): string {
    if (!data || data.length === 0) return '';
    const parser = new Parser();
    return parser.parse(data);
  }

  async exportExcel(data: any[], sheetName = 'Report'): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    if (data && data.length > 0) {
      // Create headers
      const headers = Object.keys(data[0]).map((key) => ({
        header: key.toUpperCase(),
        key,
        width: 20,
      }));
      worksheet.columns = headers;

      // Add rows
      worksheet.addRows(data);

      // Style headers
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2A2C4E' }, // Brand Indigo
      };
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as unknown as Buffer;
  }

  async exportPdf(data: any[], title = 'Report'): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 30, size: 'A4' });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        // Title
        doc.fontSize(20).text(title, { align: 'center' });
        doc.moveDown();

        if (data && data.length > 0) {
          const keys = Object.keys(data[0]);
          
          data.forEach((row, index) => {
            doc.fontSize(12).text(`Row ${index + 1}:`, { underline: true });
            keys.forEach((key) => {
              doc.fontSize(10).text(`${key}: ${row[key]}`);
            });
            doc.moveDown();
          });
        } else {
          doc.fontSize(12).text('No data available.');
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
