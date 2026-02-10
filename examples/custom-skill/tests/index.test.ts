/**
 * Unit tests for the PriceAlert skill
 */

import { describe, it, expect, vi } from 'vitest';
import { createTestContext } from '@worpx/skills-core/testing';
import PriceAlertSkill from '../src/index';

describe('PriceAlertSkill', () => {
  const skill = new PriceAlertSkill();

  it('should return triggered=true when price is above threshold', async () => {
    const ctx = createTestContext({
      params: {
        token: 'ETH',
        threshold: 3000,
        direction: 'above',
        notifyOnTrigger: false,
      },
      mocks: {
        market: {
          getPrice: vi.fn().mockResolvedValue(3500.00),
        },
        storage: {
          get: vi.fn().mockResolvedValue(null),
          set: vi.fn().mockResolvedValue(undefined),
        },
      },
    });

    const result = await skill.execute(ctx);

    expect(result.success).toBe(true);
    expect(result.data.triggered).toBe(true);
    expect(result.data.currentPrice).toBe(3500.00);
  });

  it('should return triggered=false when price is below threshold', async () => {
    const ctx = createTestContext({
      params: {
        token: 'ETH',
        threshold: 4000,
        direction: 'above',
        notifyOnTrigger: false,
      },
      mocks: {
        market: {
          getPrice: vi.fn().mockResolvedValue(3500.00),
        },
        storage: {
          get: vi.fn().mockResolvedValue(null),
          set: vi.fn().mockResolvedValue(undefined),
        },
      },
    });

    const result = await skill.execute(ctx);

    expect(result.success).toBe(true);
    expect(result.data.triggered).toBe(false);
  });

  it('should send notification when triggered and notifyOnTrigger is true', async () => {
    const mockNotify = vi.fn().mockResolvedValue(undefined);

    const ctx = createTestContext({
      params: {
        token: 'BTC',
        threshold: 50000,
        direction: 'above',
        notifyOnTrigger: true,
      },
      mocks: {
        market: {
          getPrice: vi.fn().mockResolvedValue(55000.00),
        },
        storage: {
          get: vi.fn().mockResolvedValue(null),
          set: vi.fn().mockResolvedValue(undefined),
        },
        notify: mockNotify,
      },
    });

    await skill.execute(ctx);

    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Price Alert Triggered',
        priority: 'high',
      })
    );
  });

  it('should calculate price change from stored previous price', async () => {
    const ctx = createTestContext({
      params: {
        token: 'ETH',
        threshold: 3000,
        direction: 'above',
        notifyOnTrigger: false,
      },
      mocks: {
        market: {
          getPrice: vi.fn().mockResolvedValue(3300.00),
        },
        storage: {
          get: vi.fn().mockResolvedValue('3000'),
          set: vi.fn().mockResolvedValue(undefined),
        },
      },
    });

    const result = await skill.execute(ctx);

    expect(result.data.previousPrice).toBe(3000);
    expect(result.data.priceChange).toBeCloseTo(10.0, 1);
  });

  it('should handle "below" direction correctly', async () => {
    const ctx = createTestContext({
      params: {
        token: 'ETH',
        threshold: 3000,
        direction: 'below',
        notifyOnTrigger: false,
      },
      mocks: {
        market: {
          getPrice: vi.fn().mockResolvedValue(2800.00),
        },
        storage: {
          get: vi.fn().mockResolvedValue(null),
          set: vi.fn().mockResolvedValue(undefined),
        },
      },
    });

    const result = await skill.execute(ctx);

    expect(result.success).toBe(true);
    expect(result.data.triggered).toBe(true);
    expect(result.data.direction).toBe('below');
  });
});
