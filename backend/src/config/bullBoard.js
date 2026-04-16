const { createBullBoard } = require('@bull-board/api');
const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');
const { ExpressAdapter } = require('@bull-board/express');
const { archiveQueue } = require('../jobs/lostitem.archive');
// Import other queues here as they are added

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [
    new BullMQAdapter(archiveQueue),
    // new BullMQAdapter(sosEscalationQueue), etc.
  ],
  serverAdapter: serverAdapter,
});

module.exports = serverAdapter;
