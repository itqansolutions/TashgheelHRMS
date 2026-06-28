import { Test, TestingModule } from '@nestjs/testing';
import { VisaWorkflowsController } from './visa-workflows.controller';

describe('VisaWorkflowsController', () => {
  let controller: VisaWorkflowsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VisaWorkflowsController],
    }).compile();

    controller = module.get<VisaWorkflowsController>(VisaWorkflowsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
