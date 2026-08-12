export class SubmitApplicationCommand {
  constructor(
    public readonly tenantId: string,
    public readonly applicationId: string,
    public readonly actorId: string,
    public readonly expectedVersion: number,
  ) {}
}

export class ApproveApplicationCommand {
  constructor(
    public readonly tenantId: string,
    public readonly applicationId: string,
    public readonly actorId: string,
    public readonly expectedVersion: number,
    public readonly notes?: string,
  ) {}
}
