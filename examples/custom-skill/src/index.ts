/**
 * Custom Skill Integration Example
 * Shows how to define and register agent skills on the Worpx Protocol.
 */
/**
 * Worpx Protocol - Custom Skill Example
 *
 * A complete example of building a custom skill that monitors
 * token prices and triggers alerts based on configurable thresholds.
 */

import { Skill, SkillContext, SkillResult } from '@worpx/skills-core';

interface PriceAlertParams {
  token: string;
  threshold: number;
  direction: 'above' | 'below';
  notifyOnTrigger: boolean;
}

interface PriceAlertData {
  token: string;
  currentPrice: number;
  threshold: number;
  direction: string;
  triggered: boolean;
  checkedAt: number;
}

export default class PriceAlertSkill extends Skill {
  name = 'price-alert';
  version = '1.0.0';
  description = 'Monitor token prices and trigger alerts on threshold crossings';
  category = 'analytics';
  chains = ['base', 'ethereum', 'polygon', 'solana'];

  async execute(ctx: SkillContext): Promise<SkillResult> {
    const params = ctx.params as PriceAlertParams;
    const { token, threshold, direction, notifyOnTrigger = true } = params;

    ctx.logger.info('Checking price', { token, threshold, direction });

    const currentPrice = await ctx.market.getPrice(token);

    const triggered =
      direction === 'above'
        ? currentPrice > threshold
        : currentPrice < threshold;

    const data: PriceAlertData = {
      token,
      currentPrice,
      threshold,
      direction,
      triggered,
      checkedAt: Date.now(),
    };

    if (triggered && notifyOnTrigger) {
      const message =
        direction === 'above'
          ? `${token} crossed above $${threshold} (current: $${currentPrice.toFixed(2)})`
          : `${token} dropped below $${threshold} (current: $${currentPrice.toFixed(2)})`;

      await ctx.notify({
        title: 'Price Alert Triggered',
        body: message,
        priority: 'high',
        data,
      });

      ctx.logger.info('Alert triggered and notification sent', { token, currentPrice });
    }

    const lastPrice = await ctx.storage.get(`last_price_${token}`);
    await ctx.storage.set(`last_price_${token}`, currentPrice.toString());

    return {
      success: true,
      data: {
        ...data,
        previousPrice: lastPrice ? parseFloat(lastPrice) : null,
        priceChange: lastPrice
          ? ((currentPrice - parseFloat(lastPrice)) / parseFloat(lastPrice)) * 100
          : null,
      },
    };
  }
}
