const { createBullBoard } = require('@bull-board/api');
const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');
const { ExpressAdapter } = require('@bull-board/express');
const { archiveQueue } = require('../jobs/lostitem.archive');
const { expiryQueue } = require('../jobs/marketplace.expiry');

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [
    new BullMQAdapter(archiveQueue),
    new BullMQAdapter(expiryQueue),
  ],
  serverAdapter: serverAdapter,
});

module.exports = serverAdapter;
