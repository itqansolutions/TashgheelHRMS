import { Test, TestingModule } from '@nestjs/testing';
import { VisaWorkflowsService } from './visa-workflows.service';

describe('VisaWorkflowsService', () => {
  let service: VisaWorkflowsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VisaWorkflowsService],
    }).compile();

    service = module.get<VisaWorkflowsService>(VisaWorkflowsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
