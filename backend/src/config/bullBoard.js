const { createBullBoard } = require('@bull-board/api');
const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');
const { ExpressAdapter } = require('@bull-board/express');
const { archiveQueue } = require('../jobs/lostitem.archive');
const { expiryQueue } = require('../jobs/marketplace.expiry');
const { noResponseQueue } = require('../jobs/chat.noresponse');
const { dealReminderQueue } = require('../jobs/deal.reminder');

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [
    new BullMQAdapter(archiveQueue),
    new BullMQAdapter(expiryQueue),
    new BullMQAdapter(noResponseQueue),
    new BullMQAdapter(dealReminderQueue),
  ],
  serverAdapter: serverAdapter,
});

module.exports = serverAdapter;
