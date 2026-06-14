export interface PersonGroup {
  id: string;
  name: string;
  color: string;
  icon: string;
  isPinned: boolean;
  isArchived: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Person {
  id: string;
  name: string;
  englishName?: string;
  nickname?: string;
  remark?: string;
  groupId?: string;
  tagIds?: string;
  avatar?: string;
  birthday?: string;
  lunarBirthday?: string;
  foodTaboos?: string;
  preferences?: string;
  isPinned: boolean;
  isArchived: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface PersonPhone {
  id: string;
  personId: string;
  phone: string;
  label: string;
  sortOrder: number;
}

export interface PersonEmail {
  id: string;
  personId: string;
  email: string;
  label: string;
  sortOrder: number;
}

export interface PhoneEntry {
  id: string;
  label: string;
  value: string;
  note: string;
}

export interface EmailEntry {
  id: string;
  label: string;
  value: string;
  note: string;
}

export interface PersonOtherName {
  id: string;
  personId: string;
  name: string;
  label: string;
  sortOrder: number;
}

export interface OtherNameEntry {
  id: string;
  label: string;
  value: string;
  note: string;
}
