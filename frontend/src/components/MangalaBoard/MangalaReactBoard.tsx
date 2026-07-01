import React, { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { MangalaBoard } from './MangalaBoard';

export interface PlayerInfo {
  name: string;
  elo: number;
}

export interface LastMoveDetails {
  startPit: number;
  steps: number[];
  nextState: number[];
}

interface MangalaReactBoardProps {
  boardState: number[];
  isMyTurn: boolean;
  clickablePits: number[];
  p1Info: PlayerInfo;
  p2Info: PlayerInfo;
  lastMove?: LastMoveDetails | null;
  yourColor?: number | null;
  onPitClicked?: (pitIndex: number) => void;
  onAnimationComplete?: () => void;
}

const arraysEqual = (a: number[], b: number[]): boolean => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

export const MangalaReactBoard: React.FC<MangalaReactBoardProps> = ({
  boardState,
  isMyTurn,
  clickablePits,
  p1Info,
  p2Info,
  lastMove = null,
  yourColor = 0,
  onPitClicked,
  onAnimationComplete
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<MangalaBoard | null>(null);
  const appRef = useRef<PIXI.Application | null>(null);

  const onPitClickedRef = useRef(onPitClicked);
  const onAnimationCompleteRef = useRef(onAnimationComplete);

  onPitClickedRef.current = onPitClicked;
  onAnimationCompleteRef.current = onAnimationComplete;

  // 1. Initial mounting of PixiJS Application
  useEffect(() => {
    let app: PIXI.Application | null = null;
    let board: MangalaBoard | null = null;
    let isDestroyed = false;

    const handleResize = () => {
      if (app && board && containerRef.current) {
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        board.resize(w, h);
      }
    };

    const handleResizeWithDelay = () => {
      handleResize();
      setTimeout(handleResize, 100);
      setTimeout(handleResize, 300);
      setTimeout(handleResize, 600);
    };

    const init = async () => {
      const newApp = new PIXI.Application();
      await newApp.init({
        antialias: true,
        backgroundAlpha: 0, // Transparent background so container background handles wooden aesthetics
        resizeTo: containerRef.current || undefined
      });

      if (isDestroyed) {
        try {
          newApp.destroy(true, { children: true });
        } catch (e) {
          console.warn("Failed to destroy Pixi application on early unmount:", e);
        }
        return;
      }

      app = newApp;

      // Add to HTML Container
      if (containerRef.current) {
        containerRef.current.innerHTML = ''; // Clear existing
        containerRef.current.appendChild(app.canvas);
      }

      // Initialize the Board container
      board = new MangalaBoard(yourColor ?? 0);
      app.stage.addChild(board);

      // Store references
      boardRef.current = board;
      appRef.current = app;

      // Sync initial data
      board.setPlayerInfo(p1Info, p2Info);
      board.setInteractive(isMyTurn, clickablePits);
      board.initializeBoard(boardState);

      // Event handlers
      board.onPitClicked = (idx) => {
        if (onPitClickedRef.current) onPitClickedRef.current(idx);
      };
      
      board.onAnimationComplete = () => {
        if (onAnimationCompleteRef.current) onAnimationCompleteRef.current();
      };

      // Responsive Resize
      handleResizeWithDelay();
      window.addEventListener('resize', handleResizeWithDelay);
    };

    init();

    return () => {
      isDestroyed = true;
      window.removeEventListener('resize', handleResizeWithDelay);
      if (app) {
        try {
          app.destroy(true, { children: true });
        } catch (e) {
          console.warn("Failed to destroy Pixi application on unmount:", e);
        }
      }
    };
  }, [yourColor]);

  // 2. React to Board State changes
  useEffect(() => {
    if (!boardRef.current) return;

    if (lastMove && arraysEqual(lastMove.nextState, boardState)) {
      boardRef.current.updateBoardState(boardState, {
        startPit: lastMove.startPit,
        steps: lastMove.steps
      });
    } else {
      boardRef.current.updateBoardState(boardState);
    }
  }, [boardState, lastMove]);

  // 3. React to Turn / Interactive clickable pits changes
  useEffect(() => {
    if (!boardRef.current) return;
    boardRef.current.setInteractive(isMyTurn, clickablePits);
  }, [isMyTurn, clickablePits]);

  // 4. React to Player Info changes
  useEffect(() => {
    if (!boardRef.current) return;
    boardRef.current.setPlayerInfo(p1Info, p2Info);
  }, [p1Info, p2Info]);

  return (
    <div 
      ref={containerRef} 
      className="mangala-board-canvas-container"
      style={{ 
        position: 'relative',
        overflow: 'hidden'
      }} 
    />
  );
};
