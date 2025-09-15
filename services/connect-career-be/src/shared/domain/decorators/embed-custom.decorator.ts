import { Column } from 'typeorm';

/**
 * A decorator that extends TypeORM's Column decorator to automatically
 * prefix the column name with the value object name to avoid naming conflicts.
 *
 * @param prefix The prefix to add to the column name
 * @param columnOptions The options to pass to the Column decorator
 * @returns A property decorator that applies the prefix to the column name
 */
export function EmbedColumn(prefix: string, columnOptions: any = {}) {
  return function (target: any, propertyKey: string) {
    // Create a copy of the column options
    const options = { ...columnOptions };

    // If a name is not already specified, create one with the prefix
    if (!options.name) {
      options.name = `${prefix}_${propertyKey}`;
    }

    // Apply the TypeORM Column decorator with our modified options
    Column(options)(target, propertyKey);
  };
}

/**
 * A decorator to use on ValueObjects for marking properties with consistent prefixes
 * This allows for automatic application of prefixes based on the value object type
 *
 * @param prefix The prefix to use for all columns within this value object
 * @returns A class decorator
 */
export function PrefixedValueObject(prefix: string) {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    // Store the prefix for potential use in other decorators or reflection
    Reflect.defineMetadata('prefix', prefix, constructor);
    return constructor;
  };
}

/**
 * A custom decorator to be used with @Column(() => SomeValueObject)
 * that allows for prefixing all columns of the embedded value object.
 *
 * Usage:
 * @Column(() => GameAvailability)
 * @EmbeddedPrefixes('availability')
 * availability: GameAvailability;
 *
 * @param prefix The prefix to add to all columns of the embedded value object
 * @returns A property decorator that will be applied to the embedded property
 */
export function EmbeddedPrefixes(prefix: string) {
  return function (target: any, propertyKey: string) {
    // Store the prefix on the property descriptor
    const prefixKey = `${propertyKey}_prefix`;
    Reflect.defineMetadata(prefixKey, prefix, target.constructor);

    // Get the original descriptor or create a new one
    const originalDescriptor =
      Object.getOwnPropertyDescriptor(target, propertyKey) || {};

    // When TypeORM processes this entity, it will need to know about the prefix
    // We can leave a marker using metadata that our custom naming strategy can use
    Reflect.defineMetadata('embedded_prefix', prefix, target, propertyKey);
  };
}
