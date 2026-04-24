/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/Engine';
import { HUD } from './game/HUD';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from './game/Constants';
import { motion, AnimatePresence } from 'motion/react';
import { Crosshair, Play } from 'lucide-react';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'dead' | 'victory'>('menu');
  const [playerState, setPlayerState] = useState({ health: 100, armor: 0, ammo: 50, selectedWeapon: 1 });
  const [showDamage, setShowDamage] = useState(false);

  useEffect(() => {
    if (gameState !== 'playing' || !canvasRef.current) return;

    const engine = new GameEngine(canvasRef.current);
    engineRef.current = engine;

    let animationId: number;
    let lastH = 100;

    const loop = () => {
      engine.update();
      engine.render();
      
      const ps = engine.getPlayerState();
      setPlayerState({ health: ps.health, armor: ps.armor, ammo: ps.ammo, selectedWeapon: ps.selectedWeapon });

      if (ps.health < lastH) {
          setShowDamage(true);
          setTimeout(() => setShowDamage(false), 150);
      }
      lastH = ps.health;

      if (ps.health <= 0) {
        setGameState('dead');
        return;
      }

      // Check for victory (Boss killed)
      const sprites = engine.getSprites();
      const boss = sprites.find(s => s.isBoss);
      if (boss && !boss.alive) {
          setGameState('victory');
          return;
      }
      
      animationId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [gameState]);

  const startGame = () => {
    setGameState('playing');
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 overflow-hidden font-mono">
      <div className="relative w-full max-w-4xl aspect-video bg-black border-4 border-zinc-800 shadow-2xl rounded-lg overflow-hidden">
        
        {gameState === 'playing' ? (
          <>
            <canvas
              ref={canvasRef}
              width={SCREEN_WIDTH}
              height={SCREEN_HEIGHT}
              className="w-full h-full image-pixelated cursor-none bg-stone-900"
              id="game-canvas"
            />
            
            {/* Crosshair */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-50">
              <div className="w-4 h-0.5 bg-red-600"></div>
              <div className="w-0.5 h-4 bg-red-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
            </div>

            {/* Peripheral UI */}
            <div className="absolute top-4 left-4 pointer-events-none">
              <div className="bg-black/50 p-2 border-l-4 border-red-600 font-mono">
                <p className="text-red-500 text-[10px]">ST_V_0.1.2</p>
                <p className="text-white text-sm uppercase font-bold">E1M1: NEON HANGAR</p>
              </div>
            </div>

            <div className="absolute top-4 right-4 text-right pointer-events-none">
              <div className="text-red-500 font-mono text-lg font-black uppercase tracking-widest drop-shadow-[0_0_5px_rgba(255,0,0,0.5)]">
                SCORE: {(50 - playerState.ammo) * 100}
              </div>
            </div>

            <HUD player={{ ...playerState, pos: {x:0,y:0}, dir:{x:0,y:0}, plane:{x:0,y:0}, isShooting:false, shootCooldown:0 }} />
            
            {/* Damage Overlay */}
            <AnimatePresence>
              {showDamage && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.7 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-red-900/60 pointer-events-none z-10 mix-blend-multiply"
                />
              )}
            </AnimatePresence>
          </>
        ) : (
          <AnimatePresence>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black z-20 border-8 border-[#333]"
              style={{ backgroundImage: 'radial-gradient(circle at center, #441100 0%, #000000 70%)' }}
            >
              <h1 className={`text-7xl md:text-9xl font-black text-transparent bg-clip-text ${
                gameState === 'dead' ? 'bg-gradient-to-b from-red-600 to-red-950' : 
                gameState === 'victory' ? 'bg-gradient-to-b from-yellow-400 to-yellow-900' : 
                'bg-gradient-to-b from-red-700 to-black'
              } mb-8 italic tracking-tighter drop-shadow-2xl`}>
                {gameState === 'dead' ? 'YOU DIED' : gameState === 'victory' ? 'VICTORY' : 'SLAYER'}
              </h1>
              
              <motion.button
                whileHover={{ scale: 1.05, filter: 'brightness(1.2)' }}
                whileTap={{ scale: 0.95 }}
                onClick={startGame}
                className={`group relative px-16 py-6 ${
                  gameState === 'victory' ? 'bg-yellow-600' : 'bg-red-700'
                } text-white font-black text-3xl flex items-center gap-3 transition-all border-4 border-black shadow-[8px_8px_0_0_#000]`}
              >
                <div className="w-0 h-0 border-t-[15px] border-t-transparent border-l-[25px] border-l-white border-b-[15px] border-b-transparent" />
                {gameState === 'menu' ? 'NEW GAME' : 'RESPAWN'}
              </motion.button>
              
              <div className="mt-16 text-red-900 text-xs font-bold flex gap-12 tracking-[0.2em] uppercase">
                <span>[ W A S D ] NAVIGATION</span>
                <span>[ SPACE ] FIRE</span>
              </div>
            </motion.div>
          </AnimatePresence>
        )}

      </div>

      <style>{`
        .image-pixelated {
          image-rendering: pixelated;
          image-rendering: crisp-edges;
        }
      `}</style>
    </div>
  );
}
