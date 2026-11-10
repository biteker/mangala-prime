import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock Web Audio API for procedural audio synthesizer
class MockAudioContext {
  state = 'running';
  currentTime = 0;
  destination = {};

  createOscillator(): Record<string, unknown> {
    return {
      type: 'sine',
      frequency: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
  }

  createGain(): Record<string, unknown> {
    return {
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    };
  }

  resume = vi.fn().mockResolvedValue(undefined);
  close = vi.fn().mockResolvedValue(undefined);
}

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'AudioContext', {
    writable: true,
    configurable: true,
    value: MockAudioContext,
  });
}

// Mock PixiJS Application / Canvas rendering in jsdom
vi.mock('pixi.js/unsafe-eval', () => ({}));
vi.mock('pixi.js', () => ({
  Application: class {
    canvas = document.createElement('canvas');
    stage = {
      addChild: vi.fn(),
      removeChildren: vi.fn(),
    };
    renderer = {
      resize: vi.fn(),
    };
    init = vi.fn().mockResolvedValue(undefined);
    destroy = vi.fn();
  },
  Container: class {
    addChild = vi.fn();
    removeChildren = vi.fn();
  },
  Graphics: class {
    clear = vi.fn().mockReturnThis();
    roundRect = vi.fn().mockReturnThis();
    circle = vi.fn().mockReturnThis();
    fill = vi.fn().mockReturnThis();
    stroke = vi.fn().mockReturnThis();
  },
  Text: class {
    anchor = { set: vi.fn() };
    position = { set: vi.fn() };
  },
  Ticker: {
    shared: {
      add: vi.fn(),
      remove: vi.fn(),
    },
  },
}));
