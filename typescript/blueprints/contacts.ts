import { Flatfile } from "@flatfile/api";

export const contactsSheet: Flatfile.SheetConfig = {
  name: "Contacts",
  slug: "contacts",
  fields: [
    {
      key: "firstName",
      type: "string",
      label: "First Name",
    },
    {
      key: "lastName",
      type: "string",
      label: "Last Name",
    },
    {
      key: "email",
      type: "string",
      label: "Email",
    },
    {
      key: "phone",
      type: "string",
      label: "Phone",
    },
  ],
  actions: [
    {
      operation: "dedupe-email",
      mode: "background",
      label: "Dedupe emails",
      description: "Remove duplicate emails"
    },
  ]
}
