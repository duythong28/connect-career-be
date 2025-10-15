import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Application } from './application.entity';
import { User } from 'src/modules/identity/domain/entities';

export enum OfferStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  HIRED = 'hired',
  WITHDRAWN = 'withdrawn',
  NEGOTIATING = 'negotiating',
  COUNTER_OFFER = 'counter-offer',
}

export enum OfferType {
  INITIAL = 'initial',
  REVISED = 'revised',
  COUNTER = 'counter',
  FINAL = 'final',
  COUNTER_OFFER = 'counter-offer',
}

export enum SalaryPeriod {
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  PROJECT = 'project',
}

@Entity('offers')
@Index(['applicationId', 'status'])
@Index(['status', 'expiryDate'])
@Index(['offeredBy', 'createdAt'])
export class Offer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Application, { eager: true })
  @JoinColumn({ name: 'applicationId' })
  application: Application;

  @Column('uuid')
  @Index()
  applicationId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'offeredBy' })
  offeredByUser: User;

  @Column('uuid')
  offeredBy: string;

  @Column({
    type: 'enum',
    enum: OfferStatus,
    default: OfferStatus.PENDING,
  })
  @Index()
  status: OfferStatus;

  @Column({
    type: 'enum',
    enum: OfferType,
    default: OfferType.INITIAL,
  })
  offerType: OfferType;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ type: 'text' })
  details: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 10, default: 'USD' })
  currency: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  baseSalary?: number;

  @Column({
    type: 'enum',
    enum: SalaryPeriod,
    default: SalaryPeriod.YEARLY,
  })

  salaryPeriod: SalaryPeriod;
  @Column('uuid', { nullable: true })
  @Index()
  previousOfferId?: string;

  @ManyToOne(() => Offer, { nullable: true })
  @JoinColumn({ name: 'previousOfferId' })
  previousOffer?: Offer;

  @Column('uuid', { nullable: true })
  @Index()
  supersededByOfferId?: string;

  @ManyToOne(() => Offer, { nullable: true })
  @JoinColumn({ name: 'supersededByOfferId' })
  supersededByOffer?: Offer;

  @Column('uuid', { nullable: true })
  @Index()
  rootOfferId?: string;


  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  signingBonus?: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  performanceBonus?: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  equity?: string; 

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  equityPercentage?: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  relocationBonus?: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  totalCompensation?: number; 

  @Column('simple-array', { nullable: true })
  benefits?: string[]; 

  @Column({ type: 'int', nullable: true })
  ptoDays?: number; 

  @Column({ type: 'varchar', length: 255, nullable: true })
  healthInsurance?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  retirementPlan?: string;

  @Column({ type: 'text', nullable: true })
  otherBenefits?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  offerDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  @Index()
  expiryDate?: Date;

  @Column({ type: 'timestamp', nullable: true })
  proposedStartDate?: Date;

  @Column({ type: 'timestamp', nullable: true })
  acceptedDate?: Date;

  @Column({ type: 'timestamp', nullable: true })
  rejectedDate?: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiredDate?: Date;

  @Column({ type: 'timestamp', nullable: true })
  withdrawnDate?: Date;

  @Column({ type: 'timestamp', nullable: true })
  cancelledDate?: Date;

  @Column({ type: 'boolean', default: false })
  isNegotiable: boolean;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  minAcceptableAmount?: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  maxAcceptableAmount?: number;

  @Column({ type: 'int', default: 0 })
  negotiationRounds: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  negotiationNotes?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  conditions?: string;

  @Column({ type: 'int', nullable: true })
  responseDeadlineDays?: number;

  @Column({ type: 'boolean', default: false })
  requiresSignature: boolean;

  @Column({ type: 'varchar', length: 500, nullable: true })
  signatureUrl?: string;

  isPending(): boolean {
    return this.status === OfferStatus.PENDING;
  }

  isAccepted(): boolean {
    return this.status === OfferStatus.ACCEPTED;
  }

  isRejected(): boolean {
    return this.status === OfferStatus.REJECTED;
  }

  isExpired(): boolean {
    return this.status === OfferStatus.EXPIRED;
  }

  isCancelled(): boolean {
    return this.status === OfferStatus.CANCELLED;
  }

  isWithdrawn(): boolean {
    return this.status === OfferStatus.WITHDRAWN;
  }

  isNegotiating(): boolean {
    return this.status === OfferStatus.NEGOTIATING;
  }

  isCounterOffer(): boolean {
    return this.status === OfferStatus.COUNTER_OFFER;
  }

  isActive(): boolean {
    return [
      OfferStatus.PENDING,
      OfferStatus.NEGOTIATING,
      OfferStatus.COUNTER_OFFER,
    ].includes(this.status);
  }

  isFinal(): boolean {
    return [
      OfferStatus.ACCEPTED,
      OfferStatus.REJECTED,
      OfferStatus.EXPIRED,
      OfferStatus.CANCELLED,
      OfferStatus.WITHDRAWN,
    ].includes(this.status);
  }

  isExpiredByDate(): boolean {
    return this.expiryDate ? new Date() > this.expiryDate : false;
  }

  getDaysUntilExpiry(): number {
    if (!this.expiryDate) return -1;
    const now = new Date();
    const diffTime = this.expiryDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getFormattedAmount(): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this.currency,
    }).format(this.amount);
  }

  getFormattedBaseSalary(): string {
    if (!this.baseSalary) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this.currency,
    }).format(this.baseSalary);
  }

  calculateTotalCompensation(): number {
    let total = this.amount;
    if (this.signingBonus) total += this.signingBonus;
    if (this.performanceBonus) total += this.performanceBonus;
    if (this.relocationBonus) total += this.relocationBonus;
    return total;
  }

  accept(): void {
    this.status = OfferStatus.ACCEPTED;
    this.acceptedDate = new Date();
  }

  reject(): void {
    this.status = OfferStatus.REJECTED;
    this.rejectedDate = new Date();
  }

  withdraw(): void {
    this.status = OfferStatus.WITHDRAWN;
    this.withdrawnDate = new Date();
  }

  cancel(): void {
    this.status = OfferStatus.CANCELLED;
    this.cancelledDate = new Date();
  }

  expire(): void {
    this.status = OfferStatus.EXPIRED;
    this.expiredDate = new Date();
  }

  startNegotiation(): void {
    this.status = OfferStatus.NEGOTIATING;
    this.negotiationRounds += 1;
  }

  makeCounterOffer(): void {
    this.status = OfferStatus.COUNTER_OFFER;
    this.negotiationRounds += 1;
  }

  updateVersion(): void {
    this.version += 1;
  }

  setExpiryDate(days: number): void {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);
    this.expiryDate = expiryDate;
  }

  isWithinNegotiationRange(amount: number): boolean {
    if (!this.isNegotiable) return false;
    if (this.minAcceptableAmount && amount < this.minAcceptableAmount)
      return false;
    if (this.maxAcceptableAmount && amount > this.maxAcceptableAmount)
      return false;
    return true;
  }

  getNegotiationRange(): string {
    if (!this.isNegotiable) return 'Not negotiable';
    const min = this.minAcceptableAmount
      ? this.getFormattedAmount()
      : 'No minimum';
    const max = this.maxAcceptableAmount
      ? this.getFormattedAmount()
      : 'No maximum';
    return `${min} - ${max}`;
  }

  static reviseFrom(prev: Offer, overrides: Partial<Offer>): Offer {
    const next = new Offer();
    next.applicationId = prev.applicationId;
    next.offeredBy = prev.offeredBy;
    next.offerType = prev.offerType === OfferType.INITIAL ? OfferType.REVISED : prev.offerType;
    next.version = prev.version + 1;

    next.details = prev.details;
    next.amount = prev.amount;
    next.currency = prev.currency;
    next.baseSalary = prev.baseSalary;
    next.salaryPeriod = prev.salaryPeriod;
    next.signingBonus = prev.signingBonus;
    next.performanceBonus = prev.performanceBonus;
    next.equity = prev.equity;
    next.equityPercentage = prev.equityPercentage;
    next.relocationBonus = prev.relocationBonus;
    next.totalCompensation = prev.totalCompensation;
    next.benefits = prev.benefits;
    next.ptoDays = prev.ptoDays;
    next.healthInsurance = prev.healthInsurance;
    next.retirementPlan = prev.retirementPlan;
    next.otherBenefits = prev.otherBenefits;
    next.isNegotiable = prev.isNegotiable;
    next.minAcceptableAmount = prev.minAcceptableAmount;
    next.maxAcceptableAmount = prev.maxAcceptableAmount;
    next.negotiationRounds = prev.negotiationRounds;
    next.conditions = prev.conditions;
    next.responseDeadlineDays = prev.responseDeadlineDays;
    next.requiresSignature = prev.requiresSignature;

    next.previousOfferId = prev.id;
    next.rootOfferId = prev.rootOfferId ?? prev.id;

    Object.assign(next, overrides);

    return next;
  }
}
