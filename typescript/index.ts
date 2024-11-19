/**
 * This code is used in Flatfile's Custom App Tutorial
 * https://flatfile.com/docs/apps/custom
 *
 * To see all of Flatfile's code examples go to: https://github.com/FlatFilers/flatfile-docs-kitchen-sink
 */

import type { FlatfileEvent, FlatfileListener } from "@flatfile/listener";
import type { FlatfileRecord } from "@flatfile/plugin-record-hook";
import { ExcelExtractor } from "@flatfile/plugin-xlsx-extractor";

import api from "@flatfile/api";
import { recordHook } from "@flatfile/plugin-record-hook";

// TODO: Update this with your webhook.site URL for Part 4
const webhookReceiver = "https://webhook.site/1234";

export default function (listener: FlatfileListener) {
  listener.use(ExcelExtractor());

  // Part 1: Setup a listener (https://flatfile.com/docs/apps/custom/meet-the-listener)
  listener.on("**", (event: FlatfileEvent) => {
    // Log all events
    console.log(`Received event: ${event.topic}`);
  });

  listener.namespace(["space:red"], (red: FlatfileListener) => {
    // Part 2: Configure a Space (https://flatfile.com/docs/apps/custom)
    red.on(
      "job:ready",
      { job: "space:configure" },
      async (event: FlatfileEvent) => {
        const { spaceId, environmentId, jobId } = event.context;
        try {
          await api.jobs.ack(jobId, {
            info: "Gettin started.",
            progress: 10,
          });

          await api.workbooks.create({
            spaceId,
            environmentId,
            name: "All Data",
            labels: ["pinned"],
            sheets: [
              {
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
              },
            ],
            actions: [
              {
                operation: "submitAction",
                mode: "foreground",
                label: "Submit foreground",
                description: "Submit data to webhook.site",
                primary: true,
              },
            ],
          });

          const doc = await api.documents.create(spaceId, {
            title: "Getting Started",
            body:
              "# Welcome\n" +
              "### Say hello to your first customer Space in the new Flatfile!\n" +
              "Let's begin by first getting acquainted with what you're seeing in your Space initially.\n" +
              "---\n",
          });

          await api.spaces.update(spaceId, {
            environmentId,
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
                // See reference for all possible variables
              },
            },
          });

          await api.jobs.complete(jobId, {
            outcome: {
              message: "Your Space was created. Let's get started.",
              acknowledge: true,
            },
          });
        } catch (error) {
          console.error("Error:", error.stack);

          await api.jobs.fail(jobId, {
            outcome: {
              message: "Creating a Space encountered an error. See Event Logs.",
              acknowledge: true,
            },
          });
        }
      }
    );

    // Part 3: Transform and validate (https://flatfile.com/docs/apps/custom/add-data-transformation)
    red.use(
      recordHook("contacts", (record: FlatfileRecord) => {
        const capitalize = (text) => {
          const ret = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
          console.log(`${text}: ${ret}`);
          return ret;
        }
        // Validate and transform a Record's first name
        const firstName = record.get("firstName");
        if (typeof firstName === "string") {
          record.set("firstName", capitalize(firstName));
        } else {
          record.addError("firstName", "Invalid First name");
        }

        const lastName = record.get("lastName");
        if (typeof lastName === "string") {
          record.set("lastName", capitalize(lastName));
        } else {
          record.addError("lastName", "Invalid Last name");
        }

        // Validate a Record's email address
        const email = record.get("email") as string;
        const validEmailAddress = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!validEmailAddress.test(email)) {
          console.log("Invalid email address");
          record.addError("email", "Invalid email address");
        }

        const phone = record.get("phone") as string;
        const isValidPhone = /^\+?[1-9]\d{1,14}$/.test(phone);
        if (!isValidPhone) {
          const errorMessage = "Invalid phone number";
          console.error(errorMessage);
          record.addError("phone", errorMessage);
        }

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
