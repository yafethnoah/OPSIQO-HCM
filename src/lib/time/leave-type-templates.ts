export type LeaveTypeStarterTemplate = {
  key: string;
  code: string;
  name: string;
};

export const LEAVE_TYPE_STARTER_TEMPLATES: LeaveTypeStarterTemplate[] = [
  { key: "vacation", code: "VAC", name: "Vacation" },
  { key: "sick", code: "SICK", name: "Sick Leave" },
  { key: "personal", code: "PERS", name: "Personal Leave" },
  { key: "bereavement", code: "BRV", name: "Bereavement Leave" },
  { key: "family", code: "FAM", name: "Family / Caregiver Leave" },
  { key: "unpaid", code: "UNPAID", name: "Unpaid Leave" },
  { key: "jury", code: "JURY", name: "Jury / Civic Leave" },
  { key: "other", code: "OTHER", name: "Other Leave" },
];

export function leaveTypeStarter(key: string) {
  return LEAVE_TYPE_STARTER_TEMPLATES.find((template) => template.key === key);
}
