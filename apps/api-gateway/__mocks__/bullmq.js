class MockQueue {
  constructor(name) {
    this.name = name;
  }
  async add() { return { id: 'mock-job' }; }
  async close() {}
  on() {}
}

class MockWorker {
  constructor() {}
  async close() {}
  on() {}
}

class MockQueueEvents {
  constructor() {}
  async close() {}
  on() {}
}

module.exports = {
  Queue: MockQueue,
  Worker: MockWorker,
  QueueEvents: MockQueueEvents,
};
