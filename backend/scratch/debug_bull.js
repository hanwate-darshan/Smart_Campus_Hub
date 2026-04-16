const { ExpressAdapter } = require('@bull-board/express');
const serverAdapter = new ExpressAdapter();
console.log('getRouter type:', typeof serverAdapter.getRouter);
console.log('getRouter result type:', typeof serverAdapter.getRouter());
