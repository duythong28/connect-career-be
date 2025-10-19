// packages/domain/src/decorators/transactional-command.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const TRANSACTIONAL_COMMAND = 'TRANSACTIONAL_COMMAND';

export const TransactionalCommand = () =>
  SetMetadata(TRANSACTIONAL_COMMAND, true);
