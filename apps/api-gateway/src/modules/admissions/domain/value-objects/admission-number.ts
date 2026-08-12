import { ValueObject } from '@saas/core-platform/domain';

interface AdmissionNumberProps {
  value: string;
}

export class AdmissionNumber extends ValueObject<AdmissionNumberProps> {
  private constructor(props: AdmissionNumberProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): AdmissionNumber {
    if (!value || value.trim().length === 0) {
      throw new Error('Admission number cannot be empty');
    }
    return new AdmissionNumber({ value });
  }
}
