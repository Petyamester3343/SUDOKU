import {computed, Injectable, signal} from '@angular/core';

export type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'Advanced'

export interface Cell {
  value: number
  notes: number[]
}

@Injectable({providedIn: 'root'})
export class SudokuService {
  board = signal<Cell[][]>([])
  solution = signal<number[][]>([])
  initMask = signal<boolean[][]>([])
  lives = signal<number>(5)
  difficulty = signal<Difficulty>('Medium')
  gameStarted = signal<boolean>(false)

  isGameOver = computed(() => this.lives() <= 0)
  isGameWon = computed(() =>{
    if (!this.gameStarted()) return false
    return this.board().every((row, rIdx) =>
      row.every((cell, cIdx) => cell.value === this.solution()[rIdx][cIdx])
    );
  })

  genPuzzle(diff: Difficulty) {
    this.gameStarted.set(false)

    const fullGrid = this.createEmptyGrid()
    this.fillGrid(fullGrid)
    this.solution.set(fullGrid.map((row: any) => [...row]))

    const playable = this.pokeHoles(fullGrid, this.getHoleCount(diff))

    this.board.set(playable.map(row =>
      row.map(val => ({ value: val, notes: [] }))
    ))
    this.initMask.set(playable.map(row => row.map(cell => cell !== 0)))

    this.lives.set(5)
    this.gameStarted.set(true)
  }

  private fillGrid(grid: number[][]): boolean {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (grid[row][col] === 0) {
          const numbers = this.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
          for (let num of numbers) {
            if (this.isValid(grid, row, col, num)) {
              grid[row][col] = num;
              if (this.fillGrid(grid)) return true;
              grid[row][col] = 0; // Backtrack
            }
          }
          return false;
        }
      }
    }
    return true;
  }

  private isValid(grid: number[][], row: number, col: number, num: number): boolean {
    for (let i = 0; i < 9; i++) {
      const m = 3 * Math.floor(row / 3) + Math.floor(i / 3);
      const n = 3 * Math.floor(col / 3) + i % 3;
      if (grid[row][i] === num || grid[i][col] === num || grid[m][n] === num) return false;
    }
    return true;
  }

  private getHoleCount(diff: Difficulty) : number {
    const counts = {'Easy': 30, 'Medium': 42, 'Hard': 54, 'Advanced': 64 }
    return counts[diff]
  }

  private pokeHoles(grid: number[][], num: number): number[][] {
    const result = grid.map(row => [...row]);
    let removed = 0;
    while (removed < num) {
      const r = Math.floor(Math.random() * 9);
      const c = Math.floor(Math.random() * 9);
      if (result[r][c] !== 0) {
        result[r][c] = 0;
        removed++;
      }
    }
    return result;
  }

  private createEmptyGrid = () => Array.from({length: 9}, () => Array(9).fill(0))
  private shuffle = (arr: number[]) => arr.sort(() => Math.random() - 0.5)
}

export default SudokuService
