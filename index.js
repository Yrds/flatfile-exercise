/** 
 * Get your Secret key at: https://platform.flatfile.com/developers and then
 * paste it in Tools > Secrets > FLATFILE_API_KEY.
 */

import { recordHook } from '@flatfile/plugin-record-hook'
import api from '@flatfile/api'
const axios = require('axios');

/**
 * Write a basic Flatfile event subscriber. You can do nearly anything
 * that reacts to events inside Flatfile. To start - Click Run
 */

export default function(listener) {

  /** 
 * Part 1 example 
 */

  listener.on('**', (event) => {
    console.log(`Received event: ${event.topic}`);
  });


  /** 
   * Part 2 example 
   */

  listener.use(
    recordHook('contacts', (record) => {
      const value = record.get('firstName');
      if (typeof value === 'string') {
        record.set('firstName', value.toLowerCase());
      }

      const email = record.get('email');
      const validEmailAddress = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!validEmailAddress.test(email)) {
        console.log('Invalid email address');
        record.addError('email', 'Invalid email address');
      }

      return record;
    })
  );

  /** 
   * Part 3 example 
   */

  listener.filter({ job: 'workbook:submitAction' }, (configure) => {
    configure.on('job:ready', async (event) => {
      const { jobId } = event.context;

      try {
        await api.jobs.ack(jobId, {
          info: 'Starting job to submit action to webhook.site',
          progress: 10
        });

        const { records } = await event.data;
        console.log(event)
        const webhookReceiver = '<WEBHOOK URL>';
        // replace with your webhook URL

        const response = await axios.post(webhookReceiver, {
          ...event.payload,
          method: 'axios',
          records
        }, {
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.status === 200) {
          await api.jobs.complete(jobId, {
            outcome: {
              message: "Data was successfully submitted to webhook.site. Go check it out!"
            }
          });
        } else {
          throw new Error("Failed to submit data to webhook.site");
        }
      } catch (error) {
        console.log(`webhook.site[error]: ${JSON.stringify(error, null, 2)}`);

        await api.jobs.fail(jobId, {
          outcome: {
            message: "This job failed probably because it couldn't find the webhook.site URL."
          }
        });
      }
    });
  });

}

// You can see the full example used in our getting started guide in ./full-example.js