import { ValueObject } from '@saas/core-platform/domain';

interface CampaignCapacityProps {
  limit: number;
  enrolled: number;
}

export class CampaignCapacity extends ValueObject<CampaignCapacityProps> {
  private constructor(props: CampaignCapacityProps) {
    super(props);
  }

  get limit(): number {
    return this.props.limit;
  }

  get enrolled(): number {
    return this.props.enrolled;
  }

  get available(): number {
    return this.props.limit - this.props.enrolled;
  }

  public isFull(): boolean {
    return this.available <= 0;
  }

  public static create(limit: number, enrolled: number = 0): CampaignCapacity {
    if (limit < 0) throw new Error('Capacity limit cannot be negative');
    if (enrolled < 0) throw new Error('Enrolled count cannot be negative');
    
    return new CampaignCapacity({ limit, enrolled });
  }

  public enrollOne(): CampaignCapacity {
    if (this.isFull()) {
      throw new Error('Campaign capacity exceeded');
    }
    return new CampaignCapacity({
      limit: this.props.limit,
      enrolled: this.props.enrolled + 1
    });
  }
}
