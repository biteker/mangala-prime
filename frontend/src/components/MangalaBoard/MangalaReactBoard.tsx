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
  onPitClicked?: (pitIndex: number) => void;
  onAnimationComplete?: () => void;
}

export const MangalaReactBoard: React.FC<MangalaReactBoardProps> = ({
  boardState,
  isMyTurn,
  clickablePits,
  p1Info,
  p2Info,
  lastMove = null,
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

    const init = async () => {
      const newApp = new PIXI.Application();
      await newApp.init({
        antialias: true,
        backgroundAlpha: 0, // Transparent background so container background handles wooden aesthetics
        resizeTo: containerRef.current || undefined
      });

      if (isDestroyed) {
        newApp.destroy({ removeView: true }, { children: true });
        return;
      }

      app = newApp;

      // Add to HTML Container
      if (containerRef.current) {
        containerRef.current.innerHTML = ''; // Clear existing
        containerRef.current.appendChild(app.canvas);
      }

      // Initialize the Board container
      board = new MangalaBoard();
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
      handleResize();
      window.addEventListener('resize', handleResize);
    };

    init();

    return () => {
      isDestroyed = true;
      window.removeEventListener('resize', handleResize);
      if (app) {
        app.destroy({ removeView: true }, { children: true });
      }
    };
  }, []);

  // 2. React to Board State changes
  useEffect(() => {
    if (!boardRef.current) return;

    if (lastMove && lastMove.nextState === boardState) {
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
      style={{ 
        width: '100%', 
        height: '100%',
        minHeight: '450px',
        position: 'relative',
        overflow: 'hidden'
      }} 
    />
  );
};
