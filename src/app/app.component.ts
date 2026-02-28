import {Component, computed, inject, OnDestroy, OnInit, signal} from '@angular/core'
import {CommonModule} from '@angular/common';
import {SudokuService, Difficulty} from './services/sudoku.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="app-wrapper">
      <nav class="game-info">
        <div class="stat-box">
          LIVES: <span class="hp" [class.low]="game.lives() <= 2">{{ game.lives() }}</span>
        </div>
        <div class="stat-box">TIME: <span>{{ formattedTime() }}</span></div>
        <div class="stat-box">MODE: <span>{{ game.difficulty() }}</span></div>
      </nav>

      <div class="board" [class.disabled]="game.isGameOver() || game.isGameWon()">
        @for (row of game.board(); track rIdx; let rIdx = $index) {
          <div class="row">
            @for (cell of row; track cIdx; let cIdx = $index) {
              <div class="cell-wrapper">
                <input
                  type="text" inputmode="numeric" maxlength="1"
                  [value]="cell.value === 0 ? '' : cell.value"
                  [readonly]="game.initMask()[rIdx][cIdx] || game.isGameOver()"
                  [class.fixed]="game.initMask()[rIdx][cIdx]"
                  (input)="handleInput($event, rIdx, cIdx)"
                />

                @if (cell.value === 0 && cell.notes.length > 0) {
                  <div class="notes-grid">
                    @for (n of [1,2,3,4,5,6,7,8,9]; track n) {
                      <span [class.visible]="cell.notes.includes(n)">{{ n }}</span>
                    }
                  </div>
                }
              </div>
            } </div>
        } </div>

      <div class="controls">
        <button
          class="note-toggle"
          [class.active]="isNotesMode()"
          (click)="isNotesMode.set(!isNotesMode())">
          Pencil Mode: {{ isNotesMode() ? 'ON' : 'OFF' }}
        </button>
      </div>

      @if (game.isGameWon()) {
        <div class="overlay win">
          <h2>VICTORY!</h2>
          <p>Time: {{ formattedTime() }}</p>
          <button (click)="startNewGame(game.difficulty())">Play Again</button>
        </div>
      }

      @if (game.isGameOver()) {
        <div class="overlay">
          <h2>GAME OVER</h2>
          <p>Better luck next time!</p>
          <button (click)="startNewGame(game.difficulty())">Retry</button>
        </div>
      }

      <div class="difficulty-selectors">
        @for (level of levels; track level) {
          <button [class.active]="game.difficulty() === level" (click)="startNewGame(level)">{{ level }}</button>
        }
      </div>
    </div>
  `,
  styleUrls: ['./app.component.scss'],
})

export class AppComponent implements OnInit, OnDestroy {
  game = inject(SudokuService)
  levels: Difficulty[] = ['Easy', 'Medium', 'Hard', 'Advanced']

  seconds = signal(0)
  isNotesMode = signal<boolean>(false)
  timerId?: any
  formattedTime = computed(() => {
    const s = this.seconds()
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
  })

  ngOnInit() {
    this.startNewGame('Medium')
  }

  startNewGame(level: Difficulty) {
    this.game.genPuzzle(level)
    this.resetTimer()
  }

  handleInput(event: any, r: number, c: number) {
    const inEl = event.target as HTMLInputElement
    const raw = inEl.value.slice(-1)
    const val = parseInt(raw)

    inEl.value = ''

    if (isNaN(val) || val < 1 || val > 9) return

    const currentBoard = this.game.board();
    const targetCell = currentBoard[r][c];

    if (this.isNotesMode()) {
      // TOGGLE NOTE: Add if missing, remove if present
      const newNotes = targetCell.notes.includes(val)
        ? targetCell.notes.filter(n => n !== val)
        : [...targetCell.notes, val].sort();

      this.updateBoard(r, c, { ...targetCell, notes: newNotes });
    } else {
      // NORMAL MODE: Validate against solution
      if (val === this.game.solution()[r][c]) {
        // Clear notes when a correct value is placed
        this.updateBoard(r, c, { value: val, notes: [] });
      } else {
        this.game.lives.update(v => Math.max(0, v - 1));
        const wrapper = inEl.parentElement;
        wrapper?.classList.add('error-shake');
        setTimeout(() => wrapper?.classList.remove('error-shake'), 400);
      }
    }
  }

  updateBoard(r: number, c: number, newCell: any) {
    const updatedBoard = this.game.board().map((row, ri) =>
      ri === r ? row.map((cell, ci) => ci === c ? newCell : cell) : row
    );
    this.game.board.set(updatedBoard);
  }

  resetTimer() {
    if (this.timerId) clearInterval(this.timerId)

    this.seconds.set(0)

    this.timerId = setInterval(() => {
      // Check states explicitly
      const won = this.game.isGameWon();
      const lost = this.game.isGameOver();
      const active = this.game.gameStarted();

      // Debugging: This will tell us EXACTLY why it stays at 0
      console.log(`Tick: ${this.seconds()} | Active: ${active} | Won: ${won} | Lost: ${lost}`);

      if (active && !won && !lost) {
        this.seconds.update(s => s + 1);
      }
    }, 1000)
  }

  ngOnDestroy() { if (this.timerId) clearInterval(this.timerId) }
}
