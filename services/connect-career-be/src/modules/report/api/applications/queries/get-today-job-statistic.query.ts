import { IQuery } from "@nestjs/cqrs";

export class GetTodayJobStatisticQuery implements IQuery {
  constructor(public readonly todayDate: Date) {}
}