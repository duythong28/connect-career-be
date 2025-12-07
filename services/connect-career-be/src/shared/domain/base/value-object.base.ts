/**
 * Base class for all value objects
 * Value objects are immutable objects that represent a descriptive aspect of the domain
 * with no conceptual identity. They are defined by their attributes rather than identity.
 * @template T - The type of the value object's properties
 */
export abstract class ValueObject<T> {
  /**
   * The properties of the value object, made readonly to enforce immutability
   */
  protected readonly props: T;

  /**
   * Creates a new value object
   * @param props - The properties of the value object
   */
  constructor(props: T) {
    this.validate(props);
    this.props = Object.freeze(props);
  }

  /**
   * Validates the properties of the value object
   * This method should be implemented by derived classes to enforce invariants
   * @param props - The properties to validate
   */
  protected abstract validate(props: T): void;

  /**
   * Checks if this value object equals another
   * Value objects are equal if all their properties are equal
   * @param vo - The value object to compare with
   */
  public equals(vo?: ValueObject<T>): boolean {
    if (vo === null || vo === undefined) {
      return false;
    }

    if (!(vo instanceof ValueObject)) {
      return false;
    }

    return JSON.stringify(this.props) === JSON.stringify(vo.props);
  }

  /**
   * Gets a copy of the value object's properties
   * Since value objects are immutable, this returns a deep copy to prevent modification
   */
  public getProps(): T {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return JSON.parse(JSON.stringify(this.props));
  }

  /**
   * Serializes the value object to a JSON string
   */
  public serialize(): string {
    return JSON.stringify(this.props);
  }

  /**
   * Creates a new value object from a serialized string
   * @param this - The constructor of the value object class
   * @param serialized - The serialized string
   */
  public static deserialize<V extends ValueObject<T>, T>(
    this: new (props: T) => V,
    serialized: string,
  ): V {
    const props = JSON.parse(serialized) as T;
    return new this(props);
  }

  /**
   * Creates a new value object with updated properties
   * Since value objects are immutable, this returns a new instance
   * @param props - The properties to update
   */
  public update(props: Partial<T>): ValueObject<T> {
    return new (this.constructor as new (props: T) => ValueObject<T>)({
      ...this.props,
      ...props,
    });
  }
}
