import { IUnitOfWork } from '../interfaces/unit-of-work.interface';
import { Logger } from '@nestjs/common';
import { SetMetadata } from '@nestjs/common';

/**
 * Decorator for managing database transactions at method level
 * @param unitOfWorkKey - The key of the unit of work in the class instance (default: 'unitOfWork')
 */
export function Transactional(
  unitOfWorkKey: string = 'unitOfWork',
  isolationLevel?:
    | 'READ UNCOMMITTED'
    | 'READ COMMITTED'
    | 'REPEATABLE READ'
    | 'SERIALIZABLE',
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const logger = new Logger(
      `Transactional:${target.constructor.name}.${propertyKey}`,
    );

    descriptor.value = async function (...args: any[]) {
      const unitOfWork: IUnitOfWork = this[unitOfWorkKey];

      if (!unitOfWork) {
        throw new Error(`Unit of work not found at key: ${unitOfWorkKey}`);
      }

      try {
        logger.debug(
          `Beginning transaction with isolation level: ${isolationLevel || 'default'}`,
        );
        await unitOfWork.beginTransaction(isolationLevel);

        const result = await originalMethod.apply(this, args);
        await unitOfWork.commit();
        logger.debug('Transaction committed successfully');
        return result;
      } catch (error) {
        logger.error(`Transaction failed: ${error.message}`, error.stack);
        await unitOfWork.rollback();
        throw error;
      } finally {
        await unitOfWork.release();
      }
    };

    return descriptor;
  };
}
export const TRANSACTIONAL_COMMAND = 'TRANSACTIONAL_COMMAND';
export const TransactionalCommand = () =>
  SetMetadata(TRANSACTIONAL_COMMAND, true);
