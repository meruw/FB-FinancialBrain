'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import framesData from './ascii-frames.json';

// Compact cell format: [x, y, char, colorIndex, bgColorIndex?]
type CellData = (number | string)[];

type Frame = {
  duration: number;
  cells: CellData[];
};

type AsciiMotionComponentProps = {
  showControls?: boolean;
  autoPlay?: boolean;
  onReady?: (api: {
    play: () => void;
    pause: () => void;
    togglePlay: () => void;
    restart: () => void;
  }) => void;
};

const COLORS: string[] = ["#1C0A24","#391448","#551D6D","#722791","#8E31B5","#A55AC4","#BB83D3","#D2ADE1","#E8D6F0"];


const FRAMES = framesData as Frame[];

const CANVAS_WIDTH = 2160;
const CANVAS_HEIGHT = 1800;
const CELL_WIDTH = 10.8;
const CELL_HEIGHT = 18;
const FONT_SIZE = 18;
const FONT_FAMILY = "SF Mono, Monaco, Cascadia Code, Consolas, JetBrains Mono, Fira Code, Monaspace Neon, Geist Mono, Courier New, monospace";
const BACKGROUND_COLOR: string | null = null;

const AsciiMotionAnimation = (props: AsciiMotionComponentProps = {}) => {
  const { showControls = true, autoPlay = true, onReady } = props;
  const controlsVisible = showControls !== false;
  const initialAutoPlay = autoPlay !== false;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const frameIndexRef = useRef<number>(0);
  const frameElapsedRef = useRef<number>(0);
  const lastTimestampRef = useRef<number>(0);
  const restartRef = useRef<() => void>(() => {});
  const isPlayingRef = useRef<boolean>(initialAutoPlay);
  const [isPlaying, setIsPlaying] = useState<boolean>(initialAutoPlay);
  const [activeFrame, setActiveFrame] = useState<number>(0);
  const updatePlayingState = useCallback((value: boolean) => {
    isPlayingRef.current = value;
    setIsPlaying(value);
  }, []);
  const play = useCallback(() => {
    updatePlayingState(true);
  }, [updatePlayingState]);
  const pause = useCallback(() => {
    updatePlayingState(false);
  }, [updatePlayingState]);
  const togglePlay = useCallback(() => {
    updatePlayingState(!isPlayingRef.current);
  }, [updatePlayingState]);
  const restart = useCallback(() => {
    if (restartRef.current) {
      restartRef.current();
    }
  }, []);

  useEffect(() => {
    if (isPlayingRef.current !== initialAutoPlay) {
      updatePlayingState(initialAutoPlay);
    }
  }, [initialAutoPlay, updatePlayingState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    const devicePixelRatio = window.devicePixelRatio || 1;
    canvas.width = CANVAS_WIDTH * devicePixelRatio;
    canvas.height = CANVAS_HEIGHT * devicePixelRatio;
    canvas.style.width = CANVAS_WIDTH + 'px';
    canvas.style.height = CANVAS_HEIGHT + 'px';
    context.resetTransform();
    context.scale(devicePixelRatio, devicePixelRatio);
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = FONT_SIZE + 'px ' + FONT_FAMILY;
    context.imageSmoothingEnabled = false;

    frameIndexRef.current = 0;
    frameElapsedRef.current = 0;
    lastTimestampRef.current = 0;

    const drawFrame = (index: number) => {
      const frame = FRAMES[index];

      if (BACKGROUND_COLOR) {
        context.fillStyle = BACKGROUND_COLOR;
        context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      } else {
        context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }

      if (!frame) {
        return;
      }

      for (const cell of frame.cells) {
        // Cell tuple format: [x, y, char, colorIndex, bgColorIndex?]
        const x = cell[0] as number;
        const y = cell[1] as number;
        const char = cell[2] as string;
        const color = COLORS[cell[3] as number];
        const bgColor = cell.length > 4 ? COLORS[cell[4] as number] : null;

        if (bgColor) {
          context.fillStyle = bgColor;
          context.fillRect(x * CELL_WIDTH, y * CELL_HEIGHT, CELL_WIDTH, CELL_HEIGHT);
        }

        context.fillStyle = color || '#ffffff';
        context.fillText(
          char,
          x * CELL_WIDTH + CELL_WIDTH / 2,
          y * CELL_HEIGHT + CELL_HEIGHT / 2
        );
      }

      setActiveFrame(index);
    };

    drawFrame(frameIndexRef.current);

    if (FRAMES.length === 0) {
      restartRef.current = () => {
        drawFrame(0);
        setActiveFrame(0);
      };
      return;
    }

    const step = (timestamp: number) => {
      if (FRAMES.length === 0) {
        return;
      }

      if (lastTimestampRef.current === 0) {
        lastTimestampRef.current = timestamp;
      }

      const delta = timestamp - lastTimestampRef.current;
      lastTimestampRef.current = timestamp;

      if (isPlayingRef.current) {
        frameElapsedRef.current += delta;

        let nextIndex = frameIndexRef.current;
        let remaining = frameElapsedRef.current;
        let duration = FRAMES[nextIndex]?.duration ?? 16;

        while (remaining >= duration && FRAMES.length > 0) {
          remaining -= duration;
          nextIndex = (nextIndex + 1) % FRAMES.length;
          duration = FRAMES[nextIndex]?.duration ?? duration;
        }

        frameElapsedRef.current = remaining;

        if (nextIndex !== frameIndexRef.current) {
          frameIndexRef.current = nextIndex;
          drawFrame(nextIndex);
        } else {
          drawFrame(frameIndexRef.current);
        }
      } else {
        drawFrame(frameIndexRef.current);
      }

      animationFrameRef.current = window.requestAnimationFrame(step);
    };

    animationFrameRef.current = window.requestAnimationFrame(step);

    restartRef.current = () => {
      frameIndexRef.current = 0;
      frameElapsedRef.current = 0;
      lastTimestampRef.current = 0;
      drawFrame(0);
      setActiveFrame(0);
    };

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (typeof onReady === "function") {
      onReady({
        play,
        pause,
        togglePlay,
        restart,
      });
    }
  }, [onReady, play, pause, togglePlay, restart]);

  const hasFrames = FRAMES.length > 0;

  const handleTogglePlay = () => {
    if (!hasFrames) {
      return;
    }
    togglePlay();
  };

  const handleRestart = () => {
    if (!hasFrames) {
      return;
    }
    restart();
    updatePlayingState(true);
  };

  const playLabel = isPlaying ? 'Pause' : 'Play';
  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}
    >
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{
          width: CANVAS_WIDTH + 'px',
          height: CANVAS_HEIGHT + 'px',
          backgroundColor: BACKGROUND_COLOR ?? 'transparent',
          imageRendering: 'pixelated'
        }}
      />
      {controlsVisible && (
        <div
          style={{
            marginTop: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <button
            type="button"
            onClick={handleTogglePlay}
            disabled={!hasFrames}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(0, 0, 0, 0.2)',
              background: isPlaying ? '#f1f5f9' : '#111827',
              color: isPlaying ? '#111827' : '#f9fafb',
              cursor: hasFrames ? 'pointer' : 'not-allowed'
            }}
          >
            {playLabel}
          </button>
          <button
            type="button"
            onClick={handleRestart}
            disabled={!hasFrames}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(0, 0, 0, 0.2)',
              background: '#0f172a',
              color: '#f9fafb',
              cursor: hasFrames ? 'pointer' : 'not-allowed'
            }}
          >
            Restart
          </button>
          <span
            style={{ fontFamily: 'monospace', fontSize: '12px', color: '#475569' }}
          >
            {hasFrames ? 'Frame ' + (activeFrame + 1) + ' / ' + FRAMES.length : 'No frames'}
          </span>
        </div>
      )}
    </div>
  );
};

export default AsciiMotionAnimation;
