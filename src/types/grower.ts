export type Identity = 'grower' | 'cooperative';

export interface GrowerInfo {
  username: string;
  password: string;
  name: string;
  contactPhone: string;
  contactAddress: string;
  idNumber: string;
  yearsOfExperience: number;
  agriculturalPosition: string;
  idCardFrontUrl: string;
  idCardBackUrl: string;
}

export interface CooperativeInfo {
  username: string;
  password: string;
  cooperativeName: string;
  contactPerson: string;
  contactAddress: string;
  contactPhone: string;
  contactIdNumber: string;
  businessLicenseUrl: string;
  idCardFrontUrl: string;
  idCardBackUrl: string;
}

export type GrowerFormData = GrowerInfo | CooperativeInfo;
