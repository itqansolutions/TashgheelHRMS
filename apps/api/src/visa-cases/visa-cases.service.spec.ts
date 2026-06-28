import { Test, TestingModule } from '@nestjs/testing';
import { VisaCasesService } from './visa-cases.service';

describe('VisaCasesService', () => {
  let service: VisaCasesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VisaCasesService],
    }).compile();

    service = module.get<VisaCasesService>(VisaCasesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
