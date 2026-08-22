'use client';

import React, { useState, useRef, useEffect, KeyboardEvent, useCallback } from 'react';
import { fetchApi } from '../../../../lib/api';

type ScanMode = 'ARRIVAL' | 'PICKUP';
type ScanResultState = 'IDLE' | 'SUCCESS' | 'ERROR' | 'INFO';

interface ScannerProps {
  token?: string;
}

// Simple Web Audio API sound generator
const playTone = (type: 'success' | 'error' | 'info') => {
  try {
    const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'error') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } else if (type === 'info') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    }
  } catch {
    // Ignore audio context errors (e.g. if browser blocks before user interaction)
  }
};

export default function ScannerComponent({ token }: ScannerProps) {
  const [mode, setMode] = useState<ScanMode>('ARRIVAL');
  const [isManual, setIsManual] = useState(false);
  const [inputValue, setInputValue] = useState('');
  
  const [isScanning, setIsScanning] = useState(false);
  
  const [resultState, setResultState] = useState<ScanResultState>('IDLE');
  const [resultMessage, setResultMessage] = useState('');
  const [lastScanned, setLastScanned] = useState('');
  const [timestamp, setTimestamp] = useState('');
  
  const inputRef = useRef<HTMLInputElement>(null);

  const focusInput = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Aggressive focus management for scanner mode
  useEffect(() => {
    if (!isManual) {
      focusInput();
      
      const interval = setInterval(() => {
        if (document.activeElement !== inputRef.current) {
          focusInput();
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isManual, focusInput]);

  const handleScan = async (admissionNumber: string) => {
    if (!admissionNumber.trim() || isScanning) return;
    
    setIsScanning(true);
    setResultState('IDLE');
    setInputValue(''); // Clear immediately for next scan
    
    const scanMethod = isManual ? 'MANUAL' : 'BARCODE';
    const endpoint = mode === 'ARRIVAL' 
      ? '/api/v1/attendance/scan/arrival' 
      : '/api/v1/attendance/scan/pickup';
      
    try {
      const res = await fetchApi<{ data?: { status?: string }, status?: string }>(endpoint, {
        method: 'POST',
        token,
        body: JSON.stringify({ admissionNumber: admissionNumber.trim(), scanMethod })
      });
      
      setLastScanned(admissionNumber.trim());
      setTimestamp(new Date().toLocaleTimeString());
      
      // We expect the backend API to return status
      if (res.status) {
        if (res.status === 'already_checked_in' || res.status === 'already_picked_up') {
          setResultState('INFO');
          setResultMessage(res.status === 'already_checked_in' ? 'Already checked in today.' : 'Already picked up today.');
          playTone('info');
        } else {
          setResultState('SUCCESS');
          setResultMessage(mode === 'ARRIVAL' ? 'Arrival Logged' : 'Pickup Logged');
          playTone('success');
        }
      } else {
        setResultState('SUCCESS');
        setResultMessage(mode === 'ARRIVAL' ? 'Arrival Logged' : 'Pickup Logged');
        playTone('success');
      }
    } catch (error) {
      setLastScanned(admissionNumber.trim());
      setResultState('ERROR');
      setResultMessage(error instanceof Error ? error.message : 'Scan failed');
      playTone('error');
    } finally {
      setIsScanning(false);
      focusInput();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleScan(inputValue);
    }
  };

  return (
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Attendance Scanner</h1>
        <button 
          onClick={() => {
            setIsManual(!isManual);
            setResultState('IDLE');
            setTimeout(focusInput, 100);
          }}
          className="text-sm px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-gray-800 transition font-medium"
        >
          {isManual ? 'Switch to Scanner Mode' : 'Switch to Manual Mode'}
        </button>
      </div>

      <div className="flex gap-4 mb-8">
        <button
          onClick={() => {
            setMode('ARRIVAL');
            setResultState('IDLE');
            focusInput();
          }}
          className={`flex-1 py-6 text-2xl font-bold rounded-lg border-4 transition ${
            mode === 'ARRIVAL' 
              ? 'bg-green-100 border-green-600 text-green-900 shadow-md' 
              : 'bg-white border-gray-200 text-gray-500 hover:border-green-300'
          }`}
        >
          ARRIVAL MODE
          <div className="text-sm font-normal mt-2 opacity-80">Scan when student arrives at school</div>
        </button>
        
        <button
          onClick={() => {
            setMode('PICKUP');
            setResultState('IDLE');
            focusInput();
          }}
          className={`flex-1 py-6 text-2xl font-bold rounded-lg border-4 transition ${
            mode === 'PICKUP' 
              ? 'bg-blue-100 border-blue-600 text-blue-900 shadow-md' 
              : 'bg-white border-gray-200 text-gray-500 hover:border-blue-300'
          }`}
        >
          PICKUP MODE
          <div className="text-sm font-normal mt-2 opacity-80">Scan when student is collected</div>
        </button>
      </div>

      <div className="flex-1 flex flex-col relative min-h-[300px]">
        {/* Input Area */}
        <div className="mb-6 flex flex-col items-center">
          <div className={`transition-all duration-300 flex items-center justify-center w-full max-w-md ${isManual ? 'scale-100 opacity-100' : 'scale-95 opacity-80'}`}>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isScanning}
              placeholder={isManual ? "Enter Admission Number" : "Scanning..."}
              className={`w-full text-center px-6 py-4 rounded-lg border-2 outline-none transition shadow-sm ${
                isManual 
                  ? 'text-2xl border-gray-300 focus:border-blue-500 bg-white' 
                  : 'text-xl border-dashed border-gray-400 bg-gray-50 focus:border-green-500 focus:ring-2 focus:ring-green-200'
              }`}
              autoComplete="off"
              spellCheck="false"
            />
            {isManual && (
              <button 
                onClick={() => handleScan(inputValue)}
                disabled={isScanning || !inputValue.trim()}
                className="ml-2 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition disabled:opacity-50"
              >
                Submit
              </button>
            )}
          </div>
          
          {!isManual && (
            <div className="mt-4 flex items-center gap-2 text-gray-500 font-medium">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              READY TO SCAN
            </div>
          )}
        </div>

        {/* Feedback Area */}
        {resultState !== 'IDLE' && (
          <div className={`w-full flex-1 rounded-xl flex flex-col items-center justify-center p-8 text-center transition duration-200 ${
            resultState === 'SUCCESS' && mode === 'ARRIVAL' ? 'bg-green-500 text-white' :
            resultState === 'SUCCESS' && mode === 'PICKUP' ? 'bg-blue-500 text-white' :
            resultState === 'ERROR' ? 'bg-red-500 text-white' :
            'bg-amber-400 text-amber-950'
          }`}>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4 uppercase tracking-wider">
              {resultState === 'SUCCESS' ? 'SUCCESS' : resultState === 'ERROR' ? 'ERROR' : 'INFO'}
            </h2>
            <div className="text-2xl md:text-3xl font-bold mb-2">
              {resultMessage}
            </div>
            {lastScanned && (
              <div className="text-xl md:text-2xl font-mono mt-4 p-3 bg-black/10 rounded-lg">
                ID: {lastScanned}
              </div>
            )}
            {timestamp && (
              <div className="text-sm md:text-base font-medium mt-6 opacity-80">
                {timestamp}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
