// File: apps/frontend/app/lib/requests/constants.ts
// Purpose: Dropdown options and labels for approval groups.
// Dependencies: ./types

import type { ApprovalGroup } from './types';

export const APPROVAL_GROUP_OPTIONS: {
  value: ApprovalGroup;
  label: string;
  description: string;
}[] = [
  {
    value:       'IT_CPE',
    label:       'IT / Computer Programs',
    description: 'Information Technology, Computer Engineering, Computer Science',
  },
  {
    value:       'ART_SCIENCE',
    label:       'Arts & Communication',
    description: 'Multimedia Arts, Bachelor of Arts in Communication (BACOM)',
  },
  {
    value:       'THM_BM',
    label:       'Tourism, Hospitality & Business',
    description: 'Tourism Management, Hospitality Management, Business Management',
  },
  {
    value:       'ASST_PRINCIPAL',
    label:       'Senior High School',
    description: 'Senior High School programs',
  },
  {
    value:       'GEN_ED',
    label:       'General Education',
    description: 'General Education programs',
  },
];