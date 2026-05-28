import { ServiceBusClient } from '@azure/service-bus';
import { env } from '../env.js';
import { logger } from '../utils/logger.js';

export async function alertCriticalRisk(transactionId: string, riskLabel: string): Promise<void> {
  if (!env.AZURE_SERVICEBUS_CONNECTION_STRING) return;

  const sbClient = new ServiceBusClient(env.AZURE_SERVICEBUS_CONNECTION_STRING);
  const sender = sbClient.createSender(env.AZURE_SERVICEBUS_QUEUE);
  try {
    await sender.sendMessages({
      body: {
        transactionId,
        riskLabel,
        detectedAt: new Date().toISOString(),
        source: 'FastBank Memories',
      },
      contentType: 'application/json',
      subject: 'Critical Risk Detected',
    });
    logger.info('servicebus.alert.sent', { transactionId, riskLabel });
  } finally {
    await sender.close();
    await sbClient.close();
  }
}
