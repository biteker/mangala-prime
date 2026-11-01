import { SlidingWindowLimiter } from './sliding-window-limiter';

describe('SlidingWindowLimiter', () => {
  it('should_allow_requests_within_limit', () => {
    // Arrange
    const limiter = new SlidingWindowLimiter(3, 10_000);
    const now = 1_000_000;

    // Act & Assert
    expect(limiter.tryConsume('user-1', now)).toBe(true);
    expect(limiter.tryConsume('user-1', now + 100)).toBe(true);
    expect(limiter.tryConsume('user-1', now + 200)).toBe(true);
  });

  it('should_reject_requests_exceeding_limit_within_window', () => {
    // Arrange
    const limiter = new SlidingWindowLimiter(2, 5_000);
    const now = 1_000_000;

    // Act
    limiter.tryConsume('user-1', now);
    limiter.tryConsume('user-1', now + 1_000);
    const thirdAttempt = limiter.tryConsume('user-1', now + 2_000);

    // Assert
    expect(thirdAttempt).toBe(false);
  });

  it('should_allow_requests_again_after_window_slides_past_old_events', () => {
    // Arrange
    const limiter = new SlidingWindowLimiter(2, 5_000);
    const start = 1_000_000;

    // Act
    expect(limiter.tryConsume('user-1', start)).toBe(true);
    expect(limiter.tryConsume('user-1', start + 2_000)).toBe(true);
    expect(limiter.tryConsume('user-1', start + 4_999)).toBe(false);

    // At start + 5000, the event at `start` is outside (timestamp > now - windowMs -> 1000000 > 1000000 is false)
    const afterSlide = limiter.tryConsume('user-1', start + 5_000);

    // Assert
    expect(afterSlide).toBe(true);
  });

  it('should_track_different_keys_independently', () => {
    // Arrange
    const limiter = new SlidingWindowLimiter(1, 10_000);
    const now = 1_000_000;

    // Act & Assert
    expect(limiter.tryConsume('ip-1', now)).toBe(true);
    expect(limiter.tryConsume('ip-1', now + 100)).toBe(false);
    expect(limiter.tryConsume('ip-2', now + 100)).toBe(true);
  });

  it('should_prune_expired_keys_to_prevent_memory_leak', () => {
    // Arrange
    const limiter = new SlidingWindowLimiter(2, 5_000, 3);
    const start = 1_000_000;

    // Act
    limiter.tryConsume('stale-key-1', start);
    limiter.tryConsume('stale-key-2', start + 100);
    expect(limiter.getTrackedKeyCount()).toBe(2);

    // 3rd operation triggers automatic prune at start + 10_000
    limiter.tryConsume('fresh-key', start + 10_000);

    // Assert
    expect(limiter.getTrackedKeyCount()).toBe(1);
  });
});
