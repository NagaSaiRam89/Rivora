const { Queue } = require('bullmq')
const IORedis = require('ioredis')

const connection = new IORedis(process.env.UPSTASH_REDIS_URL, {
  maxRetriesPerRequest: null,
  tls: true
});

const videoQueue = new Queue('video-processing', { connection })

module.exports = { videoQueue }
