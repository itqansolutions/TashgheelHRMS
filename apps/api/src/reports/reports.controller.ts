import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ExportService } from './export.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly exportService: ExportService,
  ) {}

  private async handleExport(res: any, data: any[], exportType: string, filename: string) {
    if (exportType === 'csv') {
      const csv = this.exportService.exportCsv(data);
      res.header('Content-Type', 'text/csv');
      res.attachment(`${filename}.csv`);
      return res.send(csv);
    } else if (exportType === 'excel') {
      const buffer = await this.exportService.exportExcel(data, filename);
      res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.attachment(`${filename}.xlsx`);
      return res.send(buffer);
    } else if (exportType === 'pdf') {
      const pdf = await this.exportService.exportPdf(data, `Report: ${filename}`);
      res.header('Content-Type', 'application/pdf');
      res.attachment(`${filename}.pdf`);
      return res.send(pdf);
    }
    
    // Default json
    return res.json(data);
  }

  @Get('dashboard')
  async getDashboardKpis() {
    return this.reportsService.getDashboardKpis();
  }

  @Get('recruiters')
  @ApiQuery({ name: 'export', required: false, enum: ['csv', 'excel', 'pdf'] })
  async getRecruiterPerformance(@Query('export') exportType: string, @Res() res: any) {
    const data = await this.reportsService.getRecruiterPerformance();
    if (exportType) return this.handleExport(res, data, exportType, 'recruiters_performance');
    return res.json(data);
  }

  @Get('pipeline')
  @ApiQuery({ name: 'export', required: false, enum: ['csv', 'excel', 'pdf'] })
  async getPipelineFunnel(@Query('export') exportType: string, @Res() res: any) {
    const data = await this.reportsService.getPipelineFunnel();
    if (exportType) return this.handleExport(res, data, exportType, 'pipeline_funnel');
    return res.json(data);
  }

  @Get('clients')
  @ApiQuery({ name: 'export', required: false, enum: ['csv', 'excel', 'pdf'] })
  async getClientReport(@Query('export') exportType: string, @Res() res: any) {
    const data = await this.reportsService.getClientReport();
    if (exportType) return this.handleExport(res, data, exportType, 'client_report');
    return res.json(data);
  }

  @Get('finance')
  @ApiQuery({ name: 'export', required: false, enum: ['csv', 'excel', 'pdf'] })
  async getFinanceReport(@Query('export') exportType: string, @Res() res: any) {
    const data = await this.reportsService.getFinanceReport();
    if (exportType) return this.handleExport(res, data, exportType, 'finance_report');
    return res.json(data);
  }
}

