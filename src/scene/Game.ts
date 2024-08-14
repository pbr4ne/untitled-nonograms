import Phaser from 'phaser';
import Grid from '../prefabs/Grid';
import ClueSection from '../prefabs/ClueSection';
import Palette from '../prefabs/Palette';
import Puzzle from '../game/Puzzle';

export default class Game extends Phaser.Scene {
    private isDrawing: boolean = false;
    private drawType: 'fill' | 'mark' | 'clear' = 'clear';
    private borderSize: number = 2;
    private gridBorderThickness: number = 5;
    private gapSize: number = 10;
    private grid?: Grid;
    private rowClues?: ClueSection;
    private colClues?: ClueSection;
    private palette?: Palette;
    private puzzleData?: Puzzle;
    private level: string = "picture2";

    //size of puzzle
    private cellSize: number = 30;
    private offsetX: number = 0;
    private offsetY: number = 0;
    private gridOffsetX: number = 0;
    private gridOffsetY: number = 0;

    constructor() {
        super({ key: 'Game' });
    }

    create() {
        this.puzzleData = new Puzzle(this.textures.get(this.level));
        this.initializeSize();

        this.grid = new Grid(this, this.cellSize, this.puzzleData.getWidth(), this.puzzleData.getHeight(), this.borderSize, this.gridBorderThickness, this.gridOffsetX, this.gridOffsetY);
        this.rowClues = new ClueSection(this, this.cellSize, this.borderSize, this.gridOffsetX, this.gridOffsetY, this.puzzleData.getRowClues(), true);
        this.colClues = new ClueSection(this, this.cellSize, this.borderSize, this.gridOffsetX, this.gridOffsetY, this.puzzleData.getColClues(), false);
        this.palette = new Palette(this, this.borderSize, this.gapSize, this.puzzleData.extractUniqueColors(), this.cellSize);
    
        let complementaryColor = this.puzzleData?.getComplementaryBackgroundColor();

        this.cameras.main.setBackgroundColor(complementaryColor);

        this.input.mouse?.disableContextMenu();
        this.setupInputEvents();
    }

    private setupInputEvents() {
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            this.isDrawing = true;
            this.determineDrawType(pointer);
            this.fillCell(pointer);
        });
        this.input.on('pointerup', () => {
            this.isDrawing = false;
            this.checkCompletion();
        });
        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (this.isDrawing) {
                this.fillCell(pointer);
            }
        });
    }

    private determineDrawType(pointer: Phaser.Input.Pointer) {
        const pointerX = Math.floor((pointer.x - this.gridOffsetX) / this.cellSize);
        const pointerY = Math.floor((pointer.y - this.gridOffsetY) / this.cellSize);

        if (!this.grid || pointerX < 0 || pointerX >= this.grid.cellColors[0].length || pointerY < 0 || pointerY >= this.grid.cellColors.length) {
            return;
        }

        const currentState = this.grid.cellStates[pointerY][pointerX];
        const selectedColor = this.palette?.getCurrentColor();

        if (pointer.rightButtonDown()) {
            if (currentState === 'empty' || currentState === 'filled') {
                this.drawType = 'mark';
            } else if (currentState === 'marked') {
                this.drawType = 'clear';
            }
        } else {
            if (currentState === 'empty' || currentState === 'marked') {
                if (selectedColor !== null) {
                    this.drawType = 'fill';
                }
            } else if (currentState === 'filled') {
                const currentColor = this.grid.cellColors[pointerY][pointerX];
                if (selectedColor !== null && currentColor !== selectedColor) {
                    this.drawType = 'fill';
                } else {
                    this.drawType = 'clear';
                }
            }
        }
    }

    private initializeSize() {
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
    
        if (this.puzzleData) {
            //puzzle size + clues + gaps
            const numBlocksWidth = this.puzzleData.getWidth() + this.puzzleData.getRowClues().length + 1;
            const numBlocksHeight = this.puzzleData.getHeight() + this.puzzleData.getColClues().length + 1;

            const maxCellWidth = screenWidth / numBlocksWidth;
            const maxCellHeight = screenHeight / numBlocksHeight;

            this.cellSize = Math.min(maxCellWidth, maxCellHeight);
            this.offsetX = (screenWidth - this.cellSize * numBlocksWidth) / 2 - (this.cellSize / 2);
            this.offsetY = (screenHeight - this.cellSize * numBlocksHeight) / 2 - (this.cellSize / 2);

            this.gridOffsetX = this.offsetX + (this.puzzleData.getRowClues().length * this.cellSize);
            this.gridOffsetY = this.offsetY + (this.puzzleData.getColClues().length * this.cellSize);
        }
    }

    private fillCell(pointer: Phaser.Input.Pointer) {
        const pointerX = Math.floor((pointer.x - this.gridOffsetX) / this.cellSize);
        const pointerY = Math.floor((pointer.y - this.gridOffsetY) / this.cellSize);

        if (!this.grid || pointerX < 0 || pointerX >= this.grid.cellColors[0].length || pointerY < 0 || pointerY >= this.grid.cellColors.length) {
            return;
        }

        const currentColor = this.palette?.getCurrentColor() || 0xffffff;

        if (this.drawType === 'fill') {
            this.grid.fillCell(pointerX, pointerY, currentColor);
        } else if (this.drawType === 'mark') {
            this.grid.markCell(pointerX, pointerY);
        } else if (this.drawType === 'clear') {
            this.grid.clearCell(pointerX, pointerY);
        }
    }

    private checkCompletion() {
        if (this.isGridComplete()) {
            this.finalizeGrid();
        }
    }

    private isGridComplete(): boolean {
        if (!this.grid || !this.puzzleData) {
            return false;
        }

        for (let y = 0; y < this.puzzleData?.getHeight(); y++) {
            for (let x = 0; x < this.puzzleData.getWidth(); x++) {
                const index = (x + y * this.puzzleData.getWidth()) * 4;
                const [r, g, b, a] = this.puzzleData.getData().slice(index, index + 4);
                const color = Phaser.Display.Color.GetColor(r, g, b);

                if (a === 0 && this.grid.cellColors[y][x] !== null) {
                    return false;
                }

                if (a > 0 && (this.grid.cellColors[y][x] === null || this.grid.cellColors[y][x] !== color)) {
                    return false;
                }
            }
        }
        return true;
    }

    private finalizeGrid() {
        if (!this.grid) {
            return;
        }

        //clear the x
        for (let y = 0; y < this.grid.cellColors.length; y++) {
            for (let x = 0; x < this.grid.cellColors[y].length; x++) {
                if (this.grid.cellStates[y][x] === 'marked') {
                    this.grid.clearCell(x, y);
                }
            }
        }

        this.grid.clearGridBorders();

        this.input.off('pointerdown');
        this.input.off('pointerup');
        this.input.off('pointermove');
    }

    public resize() {
        this.initializeSize();
    
        this.grid?.destroy();
        this.rowClues?.destroy();
        this.colClues?.destroy();
        this.palette?.destroy();
    
        if (!this.puzzleData) {
            return;
        }
        this.grid = new Grid(this, this.cellSize, this.puzzleData.getWidth(), this.puzzleData.getHeight(), this.borderSize, this.gridBorderThickness, this.gridOffsetX, this.gridOffsetY);
        this.rowClues = new ClueSection(this, this.cellSize, this.borderSize, this.gridOffsetX, this.gridOffsetY, this.puzzleData.getRowClues(), true);
        this.colClues = new ClueSection(this, this.cellSize, this.borderSize, this.gridOffsetX, this.gridOffsetY, this.puzzleData.getColClues(), false);
        this.palette = new Palette(this, this.borderSize, this.gapSize, this.puzzleData.extractUniqueColors(), this.cellSize);
    
        this.setupInputEvents();
    }
}