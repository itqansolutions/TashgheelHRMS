import { Test, TestingModule } from '@nestjs/testing';
import { VisaCasesController } from './visa-cases.controller';

describe('VisaCasesController', () => {
  let controller: VisaCasesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VisaCasesController],
    }).compile();

    controller = module.get<VisaCasesController>(VisaCasesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
