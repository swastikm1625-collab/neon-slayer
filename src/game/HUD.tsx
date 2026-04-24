/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PlayerState } from './Types';
import { motion } from 'motion/react';

interface HUDProps {
    player: PlayerState;
}

export const HUD: React.FC<HUDProps> = ({ player }) => {
    return (
        <div id="game-hud" className="absolute bottom-0 left-0 w-full h-24 bg-[#333] border-t-4 border-[#1a1a1a] flex items-stretch text-[#ff0000] font-black uppercase overflow-hidden select-none pointer-events-none">
            {/* Ammo */}
            <div className="w-[15%] flex flex-col items-center justify-center bg-[#222] border-r-2 border-black shadow-inner">
                <span className="text-[10px] text-gray-500">Ammo</span>
                <span className="text-3xl leading-none tracking-tighter">{player.ammo.toString().padStart(3, '0')}</span>
            </div>
            
            {/* Health */}
            <div className="w-[15%] flex flex-col items-center justify-center bg-[#222] border-r-2 border-black">
                <span className="text-[10px] text-gray-500">Health</span>
                <span className="text-3xl leading-none tracking-tighter">{player.health}%</span>
            </div>

            {/* Arms Selection */}
            <div className="flex-grow flex flex-col items-center justify-center px-2 bg-[#2a2a2a] border-r-2 border-black">
                <span className="text-[8px] text-gray-500 mb-1 self-start">Arms</span>
                <div className="grid grid-cols-3 gap-1 w-full text-xs">
                    {[1, 2, 3, 4, 5, 6].map(num => (
                        <div 
                            key={num} 
                            className={`${player.selectedWeapon === num ? 'text-red-500 drop-shadow-[0_0_2px_red] font-black' : 'text-gray-700'} ${num > 3 ? 'opacity-20' : ''}`}
                        >
                            {num}
                        </div>
                    ))}
                </div>
            </div>

            {/* Character Face */}
            <div className="w-[20%] flex items-center justify-center bg-[#444] border-x-2 border-black relative overflow-hidden">
                <div className="w-12 h-14 bg-[#ffcc99] border-2 border-black flex flex-col items-center pt-1">
                    <div className="flex gap-2">
                        <div className="w-2 h-1 bg-white border-b border-black"></div>
                        <div className="w-2 h-1 bg-white border-b border-black"></div>
                    </div>
                    <div className="w-6 h-3 border-b-2 border-red-700 mt-2 rounded-full"></div>
                </div>
                {player.health < 30 && <div className="absolute inset-0 bg-red-600/30 animate-pulse" />}
            </div>

            {/* Armor */}
            <div className="w-[15%] flex flex-col items-center justify-center bg-[#222] border-l-2 border-black">
                <span className="text-[10px] text-gray-500">Armor</span>
                <span className="text-3xl leading-none tracking-tighter">{player.armor.toString().padStart(3, '0')}%</span>
            </div>

            {/* Keycards & Status */}
            <div className="w-[15%] flex flex-col items-start justify-center bg-[#222] px-2 gap-1">
                <div className="w-3 h-4 bg-blue-600 border border-white opacity-20"></div>
                <div className="w-3 h-4 bg-yellow-600 border border-white opacity-20"></div>
                <div className="w-3 h-4 bg-red-600 border border-white opacity-20"></div>
            </div>
        </div>
    );
};
