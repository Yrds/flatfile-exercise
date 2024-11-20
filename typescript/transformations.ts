import { FlatfileRecord } from "@flatfile/plugin-record-hook";

export const transformCapitalize = (record: FlatfileRecord, field: string) : void => {
  const text = record.get(field) as string;
  record.set(field, text.charAt(0).toUpperCase() + text.slice(1).toLowerCase());
}
