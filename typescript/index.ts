/**
 * This code is used in Flatfile's Custom App Tutorial
 * https://flatfile.com/docs/apps/custom
 *
 * To see all of Flatfile's code examples go to: https://github.com/FlatFilers/flatfile-docs-kitchen-sink
 */

import type { FlatfileEvent, FlatfileListener } from "@flatfile/listener";
import type { FlatfileRecord } from "@flatfile/plugin-record-hook";

import { ExcelExtractor } from "@flatfile/plugin-xlsx-extractor";
import { dedupePlugin } from "@flatfile/plugin-dedupe";

import api from "@flatfile/api";
import { recordHook } from "@flatfile/plugin-record-hook";
import { configureSpace } from "@flatfile/plugin-space-configure";

import { contactsSheet } from "./blueprints/contacts";
import { validateEmail, validatePhone, validateString } from "./validations";
import { transformCapitalize } from "./transformations";

const webhookReceiver = "https://webhook.site/1234";

export default function (listener: FlatfileListener) {
  listener.use(
    dedupePlugin("dedupe-email", {
      on: "email",
      keep: "last"
    })
  )
  listener.use(ExcelExtractor());
  listener.namespace(["space:red"], (red: FlatfileListener) => {
    red.use(configureSpace(
      {
        workbooks: [
          {
            name: "All Data",
            labels: ["pinned"],
            sheets: [contactsSheet],
            actions: [
              {
                operation: "submitAction",
                mode: "foreground",
                label: "Submit foreground",
                description: "Submit data to webhook.site",
                primary: true,
              },
            ]
          }
        ],
        space: {
          metadata: {
            theme: {
              root: {
                primaryColor: "#022043",
              },
              sidebar: {
                logo: "https://www.workday.com/content/dam/web/zz/images/logos/workday/workday-logo.svg",
                backgroundColor: "#022043",
                textColor: "white",
                activeTextColor: "midnightblue",
              },
            },
          },
        }
      }
    ));

    red.use(
      recordHook("contacts", (record: FlatfileRecord) => {
        validateString(record, "firstName", "First Name");
        validateString(record, "lastName", "Last Name");
        validateEmail(record, "email");
        validatePhone(record, "phone");

        transformCapitalize(record, "firstName");
        transformCapitalize(record, "lastName");

        return record;
      })
    );

    // Part 4: Configure a submit Action (https://flatfile.com/docs/apps/custom/submit-action)
    red.on(
      "job:ready",
      { job: "workbook:submitAction" },
      async (event: FlatfileEvent) => {
        const { payload } = event;
        const { jobId, workbookId } = event.context;

        // Acknowledge the job
        try {
          await api.jobs.ack(jobId, {
            info: "Starting job to submit action to webhook.site",
            progress: 10,
          });

          // Collect all Sheet and Record data from the Workbook
          const { data: sheets } = await api.sheets.list({ workbookId });
          const records: { [name: string]: any } = {};
          for (const [index, element] of sheets.entries()) {
            records[`Sheet[${index}]`] = await api.records.get(element.id);
          }

          console.log(JSON.stringify(records, null, 2));

          // Send the data to our webhook.site URL
          const response = await fetch(webhookReceiver, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              ...payload,
              method: "fetch",
              sheets,
              records,
            }),
          });

          if (response.status !== 200) {
            throw new Error("Failed to submit data to webhook.site");
          }

          // Otherwise, complete the job
          await api.jobs.complete(jobId, {
            outcome: {
              message: `Data was successfully submitted to Webhook.site. Go check it out at ${webhookReceiver}.`,
            },
          });
        } catch (error) {
          // If an error is thrown, fail the job
          console.log(`webhook.site[error]: ${JSON.stringify(error, null, 2)}`);
          await api.jobs.fail(jobId, {
            outcome: {
              message: `This job failed. Check your ${webhookReceiver}.`,
            },
          });
        }
      }
    );
  });
}
