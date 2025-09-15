import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BaseUnitOfWork } from '../base';
import { Observable, switchMap, from, catchError, throwError } from 'rxjs';

export const TRANSACTIONAL_KEY = 'transactional';
/**
 * Transaction interceptor for handling database transactions
 * @param unitOfWorkToken - Injection token for the unit of work
 */
export const Transactional = (unitOfWorkToken?: string | symbol) =>
  SetMetadata(TRANSACTIONAL_KEY, { unitOfWorkToken });

/**
 * Transaction interceptor for NestJS
 * Wraps controller methods or command handlers in a transaction
 */
@Injectable()
export class TransactionInterceptor implements NestInterceptor {
  /**
   * Create a new transaction interceptor
   * @param reflector - NestJS reflector for accessing metadata
   * @param unitOfWork - Unit of work instance
   */
  constructor(
    private readonly reflector: Reflector,
    private readonly unitOfWork: BaseUnitOfWork,
  ) {}

  /**
   * Intercept method execution and wrap in a transaction
   * @param context - Execution context
   * @param next - Call handler
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const transactionalMetadata = this.reflector.get<any>(
      TRANSACTIONAL_KEY,
      context.getHandler(),
    );

    // If not decorated with @Transactional, just execute
    if (!transactionalMetadata) {
      return next.handle();
    }

    // If already in transaction, just execute
    if (this.unitOfWork.hasActiveTransaction) {
      return next.handle();
    }

    // Execute in transaction
    return from(this.unitOfWork.beginTransaction()).pipe(
      switchMap(() => next.handle()),
      switchMap((data) =>
        from(this.unitOfWork.commit()).pipe(
          switchMap(() => Promise.resolve(data)),
        ),
      ),
      catchError((error) => {
        return from(this.unitOfWork.rollback()).pipe(
          switchMap(() => throwError(() => error)),
        );
      }),
    );
  }
}

/**
 * Factory provider for transaction interceptor
 * @param unitOfWorkToken - Injection token for the unit of work
 */
export const createTransactionInterceptorProvider = (
  unitOfWorkToken: string | symbol,
) => ({
  provide: TransactionInterceptor,
  useFactory: (reflector: Reflector, unitOfWork: BaseUnitOfWork) => {
    return new TransactionInterceptor(reflector, unitOfWork);
  },
  inject: [Reflector, unitOfWorkToken],
});
