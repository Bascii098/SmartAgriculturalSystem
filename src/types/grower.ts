export type Identity = 'grower' | 'cooperative';

export interface GrowerInfo {
  username: string;
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

export interface Plot {
  id: string
  name: string
  owner: string // username
}

export type HandoverStatus = 'pending' | 'confirmed' | 'rejected'

export interface HandoverRecord {
  id: string
  fromUser: string
  toUser: string
  plotId: string
  plotName: string
  status: HandoverStatus
  createdAt: number
}
