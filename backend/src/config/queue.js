import Queue from 'bull';
import dotenv from 'dotenv';

dotenv.config();

// Queue para processar campanhas
export const campaignQueue = new Queue('campaign-processing', process.env.REDIS_URL || 'redis://localhost:6379', {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: false,
    removeOnFail: false
  }
});

// Eventos da queue para logging
campaignQueue.on('error', (error) => {
  console.error('Queue error:', error);
});

campaignQueue.on('failed', (job, error) => {
  console.error(`Job ${job.id} failed:`, error);
});

campaignQueue.on('completed', (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

export default campaignQueue;
