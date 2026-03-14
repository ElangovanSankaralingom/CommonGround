import { GameSession } from '../../core/models/types';
import { saveAs } from 'file-saver';

const AUTOSAVE_KEY = 'commonground_autosave';

export class SaveLoadService {
  // Auto-save to localStorage after every phase
  static autoSave(gameState: GameSession): void {
    try {
      const data = JSON.stringify(gameState);
      localStorage.setItem(AUTOSAVE_KEY, data);
    } catch (e) {
      console.error('Auto-save failed:', e);
    }
  }

  // Load auto-saved game
  static loadAutoSave(): GameSession | null {
    try {
      const data = localStorage.getItem(AUTOSAVE_KEY);
      if (!data) return null;
      return JSON.parse(data) as GameSession;
    } catch {
      return null;
    }
  }

  // Clear auto-save
  static clearAutoSave(): void {
    localStorage.removeItem(AUTOSAVE_KEY);
  }

  // Has auto-save?
  static hasAutoSave(): boolean {
    return localStorage.getItem(AUTOSAVE_KEY) !== null;
  }

  // Manual save - download .commonground file
  static saveToFile(gameState: GameSession): void {
    const saveData = {
      version: '1.0.0',
      savedAt: new Date().toISOString(),
      gameState,
      hash: this.generateHash(JSON.stringify(gameState)),
    };
    const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: 'application/json' });
    const filename = `commonground_${gameState.siteName.replace(/\s+/g, '_')}_round${gameState.currentRound}_${new Date().toISOString().slice(0, 10)}.commonground`;
    saveAs(blob, filename);
  }

  // Load from .commonground file
  static async loadFromFile(file: File): Promise<GameSession> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const saveData = JSON.parse(e.target?.result as string);
          const hash = this.generateHash(JSON.stringify(saveData.gameState));
          if (hash !== saveData.hash) {
            console.warn('Save file integrity check failed - file may have been modified');
          }
          resolve(saveData.gameState as GameSession);
        } catch (err) {
          reject(new Error('Invalid save file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  // Simple hash for integrity (SHA-256 would be ideal but this works client-side)
  private static generateHash(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }
}
