
/**
 * Decorator to set a custom primary key constraint name for an entity
 * 
 * @param name The name to use for the primary key constraint
 * @returns A class decorator
 */
export function PrimaryKeyConstraint(name: string) {
  return function (target: Function) {
    // Store the constraint name as metadata on the target class
    Reflect.defineMetadata('primaryKeyConstraintName', name, target);
    
    // Get the original constructor
    const originalConstructor = target;
    
    // Get the original Entity decorator if it exists
    const originalEntityDecorator = Reflect.getMetadata('typeorm:entity', target);
    
    if (originalEntityDecorator) {
      // If there's an existing Entity decorator, modify its options
      const options = originalEntityDecorator.options || {};
      options.primaryKeyConstraintName = name;
      originalEntityDecorator.options = options;
      
      // Update the metadata
      Reflect.defineMetadata('typeorm:entity', originalEntityDecorator, target);
    }
  };
}
