// Assuming the following variables are defined globally in your web application
const { google } = require('googleapis');

const CLIENT_ID = '416001070739-tsj2f9mhrs261cio674qliprhvaes62d.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = 'https://developers.google.com/oauthplayground';
const REFRESH_TOKEN = '1//04tKO7RVMA7kiCgYIARAAGAQSNwF-L9IrZd_HnSYUqcLl64u75uvoZ1MtWrtbPq7MgCViNn47tTnlJz4ElPb5katnSPTKt5xr-3k';

// Equivalent code for a web application
const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

const repliedUsers = new Set();

async function checkEmailsAndSendReplies() {
  try {
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

    const res = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread',
    });
    const messages = res.data.messages;

    if (messages && messages.length > 0) {
      for (const message of messages) {
        const email = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
        });

        const from = email.data.payload.headers.find(
          (header) => header.name === 'From'
        );
        const toHeader = email.data.payload.headers.find(
          (header) => header.name === 'To'
        );
        const Subject = email.data.payload.headers.find(
          (header) => header.name === 'Subject'
        );

        const From = from.value;
        const toEmail = toHeader.value;
        const subject = Subject.value;

        console.log('email come From', From);
        console.log('to Email', toEmail);

        if (repliedUsers.has(From)) {
          console.log('Already replied to: ', From);
          continue;
        }

        const thread = await gmail.users.threads.get({
          userId: 'me',
          id: message.threadId,
        });

        const replies = thread.data.messages.slice(1);

        if (replies.length === 0) {
          await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
              raw: await createReplyRaw(toEmail, From, subject),
            },
          });

          const labelName = 'onVacation';
          await gmail.users.messages.modify({
            userId: 'me',
            id: message.id,
            requestBody: {
              addLabelIds: [await createLabelIfNeeded(labelName)],
            },
          });

          console.log('Sent reply to email:', From);
          repliedUsers.add(From);
        }
      }
    }
  } catch (error) {
    console.error('Error occurred:', error);
  }
}

async function createReplyRaw(from, to, subject) {
  const emailContent = `From: ${from}\nTo: ${to}\nSubject: ${subject}\n\nThank you for your message. I am unavailable right now but will respond as soon as possible.`;
  const base64EncodedEmail = btoa(emailContent);

  return base64EncodedEmail;
}

async function createLabelIfNeeded(labelName) {
  const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

  const res = await gmail.users.labels.list({ userId: 'me' });
  const labels = res.data.labels;

  const existingLabel = labels.find((label) => label.name === labelName);
  if (existingLabel) {
    return existingLabel.id;
  }

  const newLabel = await gmail.users.labels.create({
    userId: 'me',
    requestBody: {
      name: labelName,
      labelListVisibility: 'labelShow',
      messageListVisibility: 'show',
    },
  });

  return newLabel.data.id;
}

function getRandomInterval(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

setInterval(checkEmailsAndSendReplies, getRandomInterval(45, 120) * 1000);
