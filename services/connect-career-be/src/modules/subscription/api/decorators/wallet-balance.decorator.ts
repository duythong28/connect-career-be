import { SetMetadata } from '@nestjs/common';

export const RequireWalletBalance = (actionCode: string) =>
  SetMetadata('billableAction', actionCode);
