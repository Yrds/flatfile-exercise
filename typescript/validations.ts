import { FlatfileRecord } from "@flatfile/plugin-record-hook";

export const validateString = (record: FlatfileRecord, field: string, label: string = field): void => {
  if (!(typeof record.get(field) === "string")) {
    record.addError(field, `Invalid ${label}`);
  }
}

export const validateEmail = (record: FlatfileRecord, field: string): void => {
  const validEmailAddress = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!validEmailAddress.test(record.get(field) as string)) {
    record.addError("email", "Invalid email address");
  }
}

export const validatePhone = (record: FlatfileRecord, field: string): void => {
  const isValidPhone = /^\+?[1-9]\d{1,14}$/.test(record.get(field) as string);
  if (!isValidPhone) {
    record.addError("phone", "Invalid phone number");
  }
}
